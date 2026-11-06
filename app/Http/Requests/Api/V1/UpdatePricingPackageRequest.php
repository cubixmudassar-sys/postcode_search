<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePricingPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $packageId = $this->route('pricingPackage')?->id ?? $this->route('pricing_package');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('pricing_packages', 'slug')->ignore($packageId),
            ],
            'tagline' => ['nullable', 'string', 'max:255'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'amount_prefix' => ['nullable', 'string', 'max:50'],
            'billing_period' => ['nullable', Rule::in(['month', 'year', 'one_time'])],
            'custom_price_label' => ['nullable', 'string', 'max:255'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'cta_label' => ['sometimes', 'required', 'string', 'max:255'],
            'cta_target' => ['sometimes', 'required', Rule::in(['create-account', 'contact'])],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'monthly_api_calls' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
