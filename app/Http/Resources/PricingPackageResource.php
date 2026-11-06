<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PricingPackageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'tagline' => $this->tagline,
            'currency' => $this->currency,
            'amount' => $this->amount,
            'amount_prefix' => $this->amount_prefix,
            'billing_period' => $this->billing_period,
            'custom_price_label' => $this->custom_price_label,
            'price_display' => $this->priceDisplay(),
            'features' => $this->features ?? [],
            'cta_label' => $this->cta_label,
            'cta_target' => $this->cta_target,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'monthly_api_calls' => $this->monthly_api_calls,
        ];
    }
}
