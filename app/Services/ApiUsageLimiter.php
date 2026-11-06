<?php

namespace App\Services;

use App\Models\Organisation;
use App\Models\PricingPackage;
use App\Models\UsageLog;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Cache;

class ApiUsageLimiter
{
    public function monthlyLimit(Organisation $organisation): ?int
    {
        $package = PricingPackage::query()
            ->where('slug', $organisation->plan)
            ->where('is_active', true)
            ->first();

        if (! $package) {
            return 100;
        }

        return $package->monthly_api_calls;
    }

    public function monthlyUsage(Organisation $organisation, ?string $environment = null): int
    {
        $suffix = $environment ? '.'.strtolower($environment) : '';
        $cacheKey = 'org.'.$organisation->id.'.api_calls.'.now()->format('Y-m').$suffix;

        return (int) Cache::remember($cacheKey, 30, function () use ($organisation, $environment) {
            $query = UsageLog::query()
                ->where('organisation_id', $organisation->id)
                ->where('created_at', '>=', now()->copy()->startOfMonth());

            if ($environment !== null) {
                $query->where('environment', $environment);
            }

            return $query->count();
        });
    }

    public function remaining(Organisation $organisation): ?int
    {
        $limit = $this->monthlyLimit($organisation);
        if ($limit === null) {
            return null;
        }

        return max(0, $limit - $this->monthlyUsage($organisation));
    }

    public function assertWithinLimit(Organisation $organisation): void
    {
        $limit = $this->monthlyLimit($organisation);
        if ($limit === null) {
            return;
        }

        if ($this->monthlyUsage($organisation) >= $limit) {
            throw new HttpResponseException(response()->json([
                'message' => 'Plan monthly API call limit reached.',
                'error' => [
                    'code' => 429,
                    'plan' => $organisation->plan,
                    'limit' => $limit,
                    'used' => $this->monthlyUsage($organisation),
                ],
            ], 429));
        }
    }

    public function forgetUsageCache(Organisation $organisation): void
    {
        $period = now()->format('Y-m');
        Cache::forget('org.'.$organisation->id.'.api_calls.'.$period);
        Cache::forget('org.'.$organisation->id.'.api_calls.'.$period.'.test');
        Cache::forget('org.'.$organisation->id.'.api_calls.'.$period.'.live');
    }

    /**
     * @return array{used: int, used_test: int, used_live: int, limit: int|null, remaining: int|null, plan: string, period: string}
     */
    public function summary(Organisation $organisation): array
    {
        $limit = $this->monthlyLimit($organisation);
        $used = $this->monthlyUsage($organisation);
        $usedTest = $this->monthlyUsage($organisation, 'Test');
        $usedLive = $this->monthlyUsage($organisation, 'Live');

        return [
            'used' => $used,
            'used_test' => $usedTest,
            'used_live' => $usedLive,
            'limit' => $limit,
            'remaining' => $limit === null ? null : max(0, $limit - $used),
            'plan' => (string) $organisation->plan,
            'period' => now()->format('Y-m'),
        ];
    }
}
