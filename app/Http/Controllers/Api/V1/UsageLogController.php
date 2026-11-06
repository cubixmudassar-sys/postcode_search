<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UsageLogResource;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $query = $organisation->usageLogs()->with('project')->orderByDesc('created_at');

        if ($search = $request->query('query')) {
            $query->where(function ($inner) use ($search) {
                $inner->where('postcode', 'like', '%'.$search.'%')
                    ->orWhere('location', 'like', '%'.$search.'%')
                    ->orWhere('request_id', 'like', '%'.$search.'%')
                    ->orWhere('endpoint', 'like', '%'.$search.'%');
            });
        }

        if ($environment = $request->query('environment')) {
            if ($environment !== 'All') {
                $query->where('environment', $environment);
            }
        }

        if ($billing = $request->query('billing')) {
            if ($billing === 'Billable') {
                $query->where('cost', '>', 0);
            } elseif ($billing === 'Not billed') {
                $query->where('cost', '=', 0);
            }
        }

        $logs = $query->paginate(25);

        return UsageLogResource::collection($logs)->response();
    }
}
