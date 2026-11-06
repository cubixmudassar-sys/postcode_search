<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ApiUsageLimiter;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageSummaryController extends Controller
{
    public function __construct(private ApiUsageLimiter $limiter) {}

    public function show(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        return response()->json([
            'data' => $this->limiter->summary($organisation),
        ]);
    }
}
