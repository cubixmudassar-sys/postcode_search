<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Organisation;
use App\Models\Postcode;
use App\Models\Project;
use App\Models\UsageLog;
use App\Models\User;
use Illuminate\Support\Str;

class PostcodeLookupService
{
    public const POSTCODE_COST = '0.0020';

    public const ADDRESS_COST = '0.0030';

    public function normalize(?string $postcode): ?string
    {
        if ($postcode === null || trim($postcode) === '') {
            return null;
        }

        $compact = strtoupper(preg_replace('/\s+/', '', trim($postcode)) ?? '');

        if (! preg_match('/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/', $compact)) {
            return null;
        }

        $inward = substr($compact, -3);
        $outward = substr($compact, 0, -3);

        return $outward.' '.$inward;
    }

    public function findPostcode(string $postcode): ?Postcode
    {
        $normalized = $this->normalize($postcode);

        if (! $normalized) {
            return null;
        }

        return Postcode::query()->where('postcode', $normalized)->first();
    }

    /**
     * @return array<int, Postcode>
     */
    public function suggest(string $query, int $limit = 10): array
    {
        $term = strtoupper(trim($query));
        if ($term === '') {
            return [];
        }

        return Postcode::query()
            ->where('postcode', 'like', $term.'%')
            ->orderBy('postcode')
            ->limit($limit)
            ->get()
            ->all();
    }

    /**
     * @return array<int, Address>
     */
    public function searchAddresses(string $query, int $limit = 20): array
    {
        $term = trim($query);
        if ($term === '') {
            return [];
        }

        $normalized = $this->normalize($term);

        return Address::query()
            ->when($normalized, fn ($q) => $q->where('postcode', $normalized))
            ->when(! $normalized, function ($q) use ($term) {
                $q->where(function ($inner) use ($term) {
                    $inner->where('line1', 'like', '%'.$term.'%')
                        ->orWhere('building', 'like', '%'.$term.'%')
                        ->orWhereRaw("CONCAT(building, ' ', line1) like ?", ['%'.$term.'%'])
                        ->orWhere('postcode', 'like', '%'.strtoupper($term).'%');
                });
            })
            ->limit($limit)
            ->get()
            ->all();
    }

    public function recordUsage(
        string $endpoint,
        string $status,
        string $outcome,
        string $cost,
        int $latencyMs,
        ?string $postcode,
        ?string $location,
        string $environment,
        ?Organisation $organisation = null,
        ?Project $project = null,
        ?User $user = null,
    ): UsageLog {
        $log = UsageLog::query()->create([
            'organisation_id' => $organisation?->id,
            'project_id' => $project?->id,
            'user_id' => $user?->id,
            'postcode' => $postcode,
            'location' => $location,
            'endpoint' => $endpoint,
            'status' => $status,
            'outcome' => $outcome,
            'cost' => $cost,
            'latency_ms' => $latencyMs,
            'request_id' => 'req_'.Str::lower(Str::random(8)),
            'environment' => $environment,
        ]);

        if ($organisation) {
            app(ApiUsageLimiter::class)->forgetUsageCache($organisation);
        }

        return $log;
    }

    public function billIfLive(
        Organisation $organisation,
        string $cost,
        string $environment,
        bool $billable,
    ): void {
        if (! $billable || $environment !== 'Live') {
            return;
        }

        $organisation->decrement('credit_balance', $cost);
        $organisation->increment('monthly_spend', $cost);
    }

    public function locationLabel(?Postcode $postcode): ?string
    {
        if (! $postcode) {
            return null;
        }

        $parts = array_filter([$postcode->admin_district, $postcode->post_town]);

        return $parts !== [] ? implode(', ', $parts) : null;
    }
}
