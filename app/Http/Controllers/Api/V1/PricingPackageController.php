<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PricingPackageResource;
use App\Models\PricingPackage;
use Illuminate\Http\JsonResponse;

class PricingPackageController extends Controller
{
    public function index(): JsonResponse
    {
        $packages = PricingPackage::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return PricingPackageResource::collection($packages)->response();
    }
}
