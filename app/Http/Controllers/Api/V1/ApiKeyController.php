<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreApiKeyRequest;
use App\Http\Resources\ApiKeyResource;
use App\Models\ApiKey;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApiKeyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $keys = $organisation->apiKeys()->with('project')->orderByDesc('created_at')->get();

        return response()->json([
            'data' => ApiKeyResource::collection($keys)->resolve(),
        ]);
    }

    public function store(StoreApiKeyRequest $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $data = $request->validated();

        $project = $organisation->projects()->whereKey($data['project_id'])->first();

        if (! $project) {
            return response()->json(['message' => 'Project must belong to your organisation.'], 422);
        }

        $slug = $data['environment'] === 'Live' ? 'live' : 'test';
        $secret = Str::lower(Str::random(24));
        $plainKey = 'pp_'.$slug.'_'.$secret;
        $prefix = substr($plainKey, 0, 16);

        $apiKey = $organisation->apiKeys()->create([
            'project_id' => $project->id,
            'name' => $data['name'],
            'type' => $data['type'],
            'environment' => $data['environment'],
            'key_prefix' => $prefix,
            'key_hash' => ApiKey::hashKey($plainKey),
        ]);

        $apiKey->load('project');
        $apiKey->plain_key = $plainKey;

        return response()->json([
            'data' => new ApiKeyResource($apiKey),
        ], 201);
    }
}
