<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateBillingRequest;
use App\Http\Resources\OrganisationResource;
use App\Models\Organisation;
use App\Models\PricingPackage;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        return response()->json([
            'data' => $this->billingPayload($organisation),
        ]);
    }

    public function update(UpdateBillingRequest $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $data = $request->validated();

        if (array_key_exists('name', $data)) {
            $organisation->name = $data['name'];
        }

        if (array_key_exists('plan', $data)) {
            $package = PricingPackage::query()
                ->where('slug', $data['plan'])
                ->where('is_active', true)
                ->first();

            if (! $package) {
                return response()->json(['message' => 'Selected plan is not available.'], 422);
            }

            if ($package->amount === null || (float) $package->amount > 0) {
                return response()->json([
                    'message' => 'Paid plans must be purchased through checkout.',
                ], 422);
            }

            $organisation->plan = $data['plan'];
        }

        foreach (['billing_name', 'billing_phone', 'vat_number', 'auto_topup_enabled', 'auto_topup_amount', 'auto_topup_cap'] as $field) {
            if (array_key_exists($field, $data)) {
                $organisation->{$field} = $data[$field];
            }
        }

        $organisation->save();

        return response()->json([
            'data' => $this->billingPayload($organisation->fresh() ?? $organisation),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function billingPayload(Organisation $organisation): array
    {
        return [
            'organisation' => new OrganisationResource($organisation),
            'summary' => [
                'available_balance' => $organisation->credit_balance,
                'monthly_spend' => $organisation->monthly_spend,
                'plan' => $organisation->plan,
                'auto_topup_enabled' => $organisation->auto_topup_enabled,
                'auto_topup_amount' => $organisation->auto_topup_amount,
                'auto_topup_cap' => $organisation->auto_topup_cap,
                'next_renewal' => now()->startOfMonth()->addMonth()->format('d M'),
            ],
        ];
    }
}
