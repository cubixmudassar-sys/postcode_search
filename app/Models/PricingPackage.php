<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingPackage extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'tagline',
        'currency',
        'amount',
        'amount_prefix',
        'billing_period',
        'custom_price_label',
        'features',
        'cta_label',
        'cta_target',
        'is_featured',
        'sort_order',
        'is_active',
        'monthly_api_calls',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'features' => 'array',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'monthly_api_calls' => 'integer',
        ];
    }

    public function priceDisplay(): string
    {
        if (filled($this->custom_price_label)) {
            return (string) $this->custom_price_label;
        }

        $symbol = match (strtoupper((string) $this->currency)) {
            'GBP' => '£',
            'EUR' => '€',
            'USD' => '$',
            default => strtoupper((string) $this->currency).' ',
        };

        $amount = $this->amount === null
            ? '0'
            : rtrim(rtrim(number_format((float) $this->amount, 2, '.', ''), '0'), '.');

        $price = $symbol.$amount;

        if (filled($this->amount_prefix)) {
            $price = trim((string) $this->amount_prefix).' '.$price;
        }

        if ($this->billing_period === 'month') {
            $price .= ' / month';
        } elseif ($this->billing_period === 'year') {
            $price .= ' / year';
        }

        return $price;
    }
}
