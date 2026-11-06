<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SavedListItemResource;
use App\Http\Resources\SavedListResource;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $lists = $organisation->savedLists()->withCount('items')->orderBy('name')->get();

        return response()->json([
            'data' => SavedListResource::collection($lists)->resolve(),
        ]);
    }

    public function storeItem(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $validated = $request->validate([
            'postcode' => ['required', 'string', 'max:16'],
            'label' => ['nullable', 'string', 'max:255'],
            'saved_list_id' => ['nullable', 'integer', 'exists:saved_lists,id'],
            'list_name' => ['nullable', 'string', 'max:255'],
            'payload' => ['nullable', 'array'],
        ]);

        $list = null;
        if (! empty($validated['saved_list_id'])) {
            $list = $organisation->savedLists()->where('id', $validated['saved_list_id'])->firstOrFail();
        } else {
            $list = $organisation->savedLists()->firstOrCreate([
                'name' => $validated['list_name'] ?? 'Saved postcodes',
            ]);
        }

        $item = $list->items()->create([
            'postcode' => strtoupper(trim($validated['postcode'])),
            'label' => $validated['label'] ?? null,
            'payload' => $validated['payload'] ?? null,
        ]);

        return response()->json([
            'data' => new SavedListItemResource($item),
        ], 201);
    }
}
