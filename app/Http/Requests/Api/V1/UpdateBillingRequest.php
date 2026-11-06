<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBillingRequest extends FormRequest
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
        return [
            'plan' => ['sometimes', 'string', 'max:255', Rule::exists('pricing_packages', 'slug')->where('is_active', true)],
            'name' => ['sometimes', 'string', 'max:255'],
            'billing_name' => ['nullable', 'string', 'max:255'],
            'billing_phone' => ['nullable', 'string', 'max:32'],
            'vat_number' => ['nullable', 'string', 'max:255'],
            'auto_topup_enabled' => ['sometimes', 'boolean'],
            'auto_topup_amount' => ['nullable', 'numeric', 'min:0'],
            'auto_topup_cap' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
