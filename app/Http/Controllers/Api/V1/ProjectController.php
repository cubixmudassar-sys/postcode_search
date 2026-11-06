<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $projects = $organisation->projects()->orderBy('name')->get();

        return response()->json([
            'data' => ProjectResource::collection($projects)->resolve(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'environment' => ['required', Rule::in(['Test', 'Live'])],
        ]);

        $project = $organisation->projects()->create($validated);

        return response()->json([
            'data' => new ProjectResource($project),
        ], 201);
    }
}
