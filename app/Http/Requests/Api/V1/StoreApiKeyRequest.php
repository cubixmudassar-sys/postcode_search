<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApiKeyRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['Restricted', 'Secret'])],
            'environment' => ['required', Rule::in(['Test', 'Live'])],
            'project_id' => ['required', 'integer', 'exists:projects,id'],
        ];
    }
}
