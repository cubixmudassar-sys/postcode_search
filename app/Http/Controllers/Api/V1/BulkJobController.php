<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\BulkJobResource;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BulkJobController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);
        $user = $request->user();

        if (! $organisation || ! $user) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $validated = $request->validate([
            'filename' => ['nullable', 'string', 'max:255'],
            'row_count' => ['nullable', 'integer', 'min:0'],
        ]);

        $job = $organisation->bulkJobs()->create([
            'user_id' => $user->id,
            'status' => 'draft',
            'step' => 1,
            'filename' => $validated['filename'] ?? null,
            'row_count' => $validated['row_count'] ?? 0,
        ]);

        return response()->json([
            'data' => new BulkJobResource($job),
        ], 201);
    }

    public function update(Request $request, int $bulkJob): JsonResponse
    {
        $organisation = RequestContext::organisation($request);
        $user = $request->user();

        if (! $organisation || ! $user) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $job = $organisation->bulkJobs()->where('id', $bulkJob)->firstOrFail();

        $validated = $request->validate([
            'step' => ['required', 'integer', 'min:1', 'max:3'],
            'filename' => ['nullable', 'string', 'max:255'],
            'mapped_column' => ['nullable', 'string', 'max:255'],
            'row_count' => ['nullable', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'max:255'],
        ]);

        $job->fill($validated);
        $job->save();

        return response()->json([
            'data' => new BulkJobResource($job->fresh()),
        ]);
    }
}
