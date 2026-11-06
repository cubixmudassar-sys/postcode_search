<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganisationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $owner = null;

        if ($this->relationLoaded('users')) {
            $owner = $this->users->first(fn ($user) => ($user->pivot->role ?? null) === 'Owner')
                ?? $this->users->first();
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'credit_balance' => $this->credit_balance,
            'monthly_spend' => $this->monthly_spend,
            'plan' => $this->plan,
            'is_active' => (bool) $this->is_active,
            'auto_topup_enabled' => $this->auto_topup_enabled,
            'auto_topup_amount' => $this->auto_topup_amount,
            'auto_topup_cap' => $this->auto_topup_cap,
            'vat_number' => $this->vat_number,
            'billing_name' => $this->billing_name,
            'billing_phone' => $this->billing_phone,
            'card_last4' => $this->card_last4,
            'card_brand' => $this->card_brand,
            'card_expires' => $this->card_expires,
            'users_count' => $this->when(isset($this->users_count), (int) $this->users_count),
            'owner_name' => $this->when($owner !== null, $owner?->name),
            'owner_email' => $this->when($owner !== null, $owner?->email),
            'users' => $this->when(
                $this->relationLoaded('users') && $request->routeIs('admin.customers.show'),
                function () {
                    return $this->users->map(fn ($user) => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'email' => $user->email,
                        'role' => $user->pivot->role,
                        'is_active' => (bool) $user->is_active,
                    ])->values();
                }
            ),
        ];
    }
}
