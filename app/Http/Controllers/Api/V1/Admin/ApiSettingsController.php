<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\UpdateApiSettingsRequest;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;

class ApiSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'per_page' => AppSetting::lookupPerPage(),
                'pagination_enabled' => AppSetting::lookupPaginationEnabled(),
            ],
        ]);
    }

    public function update(UpdateApiSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('per_page', $validated)) {
            AppSetting::setValue(AppSetting::LOOKUP_PER_PAGE, (string) $validated['per_page']);
        }

        if (array_key_exists('pagination_enabled', $validated)) {
            AppSetting::setValue(
                AppSetting::LOOKUP_PAGINATION_ENABLED,
                $validated['pagination_enabled'] ? '1' : '0',
            );
        }

        return response()->json([
            'data' => [
                'per_page' => AppSetting::lookupPerPage(),
                'pagination_enabled' => AppSetting::lookupPaginationEnabled(),
            ],
        ]);
    }
}
