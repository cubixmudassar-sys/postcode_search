<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $projects = $organisation->projects()->count();
        $successful = $organisation->usageLogs()->where('status', '200')->count();
        $total = max($organisation->usageLogs()->count(), 1);
        $successRate = round(($successful / $total) * 100, 1);

        return response()->json([
            'data' => [
                'greeting_name' => $request->user()?->first_name,
                'credit_balance' => $organisation->credit_balance,
                'monthly_spend' => $organisation->monthly_spend,
                'active_projects' => $projects,
                'success_rate' => $successRate,
                'systems_status' => 'operational',
            ],
        ]);
    }
}
