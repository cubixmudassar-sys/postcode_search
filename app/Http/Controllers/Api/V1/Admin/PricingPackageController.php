<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePricingPackageRequest;
use App\Http\Requests\Api\V1\UpdatePricingPackageRequest;
use App\Http\Resources\PricingPackageResource;
use App\Models\PricingPackage;
use Illuminate\Http\JsonResponse;

class PricingPackageController extends Controller
{
    public function index(): JsonResponse
    {
        $packages = PricingPackage::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return PricingPackageResource::collection($packages)->response();
    }

    public function store(StorePricingPackageRequest $request): JsonResponse
    {
        $package = PricingPackage::query()->create($request->validated());

        return (new PricingPackageResource($package))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdatePricingPackageRequest $request, PricingPackage $pricingPackage): JsonResponse
    {
        $pricingPackage->update($request->validated());

        return (new PricingPackageResource($pricingPackage->fresh()))->response();
    }

    public function destroy(PricingPackage $pricingPackage): JsonResponse
    {
        $pricingPackage->delete();

        return response()->json(['data' => ['message' => 'Pricing package deleted.']]);
    }
}
