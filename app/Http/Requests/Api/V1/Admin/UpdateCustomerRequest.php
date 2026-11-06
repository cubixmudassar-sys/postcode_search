<?php

namespace App\Http\Requests\Api\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'plan' => ['sometimes', 'string', 'max:255'],
            'billing_name' => ['nullable', 'string', 'max:255'],
            'vat_number' => ['nullable', 'string', 'max:255'],
            'credit_balance' => ['sometimes', 'numeric', 'min:0'],
            'monthly_spend' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'auto_topup_enabled' => ['sometimes', 'boolean'],
            'auto_topup_amount' => ['nullable', 'numeric', 'min:0'],
            'auto_topup_cap' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
