<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\BulkJob;
use App\Models\CreditTransaction;
use Illuminate\Http\JsonResponse;

class AdminListController extends Controller
{
    public function apiOperations(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['name' => 'Postcode lookup', 'endpoint' => '/v1/postcodes/{postcode}', 'status' => 'Operational', 'latency_ms' => 84],
                ['name' => 'Address autocomplete', 'endpoint' => '/v1/addresses', 'status' => 'Operational', 'latency_ms' => 126],
                ['name' => 'Usage logs', 'endpoint' => '/v1/usage-logs', 'status' => 'Operational', 'latency_ms' => 42],
            ],
        ]);
    }

    public function providersDatasets(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['dataset' => 'Postcode Core', 'entitlement' => 'Standard', 'quota' => 'Unlimited', 'status' => 'Active'],
                ['dataset' => 'Address Provider A', 'entitlement' => 'Business', 'quota' => '250k/mo', 'status' => 'Active'],
            ],
        ]);
    }

    public function billing(): JsonResponse
    {
        $rows = CreditTransaction::query()->orderByDesc('created_at')->limit(25)->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'organisation_id' => $row->organisation_id,
                'amount' => $row->amount,
                'type' => $row->type,
                'description' => $row->description,
                'created_at' => $row->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function abuseControls(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['target' => 'Rate limit spike', 'severity' => 'Medium', 'status' => 'Monitoring'],
                ['target' => 'Invalid key attempts', 'severity' => 'Low', 'status' => 'Clear'],
            ],
        ]);
    }

    public function support(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['queue' => 'Billing', 'open' => 3, 'assigned' => 2],
                ['queue' => 'Technical', 'open' => 5, 'assigned' => 4],
            ],
        ]);
    }

    public function content(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['title' => 'Provider incident notice', 'status' => 'Draft'],
                ['title' => 'June changelog', 'status' => 'Published'],
            ],
        ]);
    }

    public function auditLog(): JsonResponse
    {
        $audits = AuditLog::query()->with(['user', 'organisation'])->orderByDesc('created_at')->paginate(25);

        return AuditLogResource::collection($audits)->response();
    }

    public function staffSettings(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['name' => 'Admin User', 'role' => 'Platform admin', 'mfa' => 'Enabled'],
            ],
        ]);
    }

    public function bulkJobs(): JsonResponse
    {
        $jobs = BulkJob::query()->orderByDesc('created_at')->limit(25)->get();

        return response()->json([
            'data' => $jobs->map(fn ($job) => [
                'id' => $job->id,
                'status' => $job->status,
                'step' => $job->step,
                'filename' => $job->filename,
                'row_count' => $job->row_count,
            ]),
        ]);
    }
}
