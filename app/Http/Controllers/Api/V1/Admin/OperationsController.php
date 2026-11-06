<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\ProviderResource;
use App\Models\AuditLog;
use App\Models\Organisation;
use App\Models\Provider;
use App\Models\UsageLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperationsController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $requestVolume = UsageLog::query()->count();
        $errors = UsageLog::query()->where('status', '!=', '200')->count();
        $errorRate = $requestVolume > 0 ? round(($errors / $requestVolume) * 100, 2) : 0;
        $avgLatency = (int) UsageLog::query()->avg('latency_ms');
        $creditLiability = Organisation::query()->sum('credit_balance');

        return response()->json([
            'data' => [
                'metrics' => [
                    'request_volume' => $requestVolume,
                    'error_rate' => $errorRate,
                    'p95_latency_ms' => $avgLatency,
                    'credit_liability' => $creditLiability,
                ],
            ],
        ]);
    }

    public function providers(): JsonResponse
    {
        return response()->json([
            'data' => ProviderResource::collection(Provider::query()->orderBy('name')->get())->resolve(),
        ]);
    }

    public function audits(): JsonResponse
    {
        $audits = AuditLog::query()
            ->with(['user', 'organisation'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => AuditLogResource::collection($audits)->resolve(),
        ]);
    }
}
