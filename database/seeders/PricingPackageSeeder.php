<?php

namespace Database\Seeders;

use App\Models\PricingPackage;
use Illuminate\Database\Seeder;

class PricingPackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'name' => 'Public',
                'slug' => 'public',
                'tagline' => 'For individual lookups',
                'currency' => 'GBP',
                'amount' => 0,
                'amount_prefix' => null,
                'billing_period' => null,
                'custom_price_label' => null,
                'features' => [
                    'Fair-use lookup allowance',
                    'Postcode-level results',
                    'No account required',
                ],
                'cta_label' => 'Choose option',
                'cta_target' => 'create-account',
                'is_featured' => false,
                'sort_order' => 1,
                'is_active' => true,
                'monthly_api_calls' => 100,
            ],
            [
                'name' => 'Credits',
                'slug' => 'credits',
                'tagline' => 'For variable API usage',
                'currency' => 'GBP',
                'amount' => 10,
                'amount_prefix' => 'From',
                'billing_period' => null,
                'custom_price_label' => null,
                'features' => [
                    'Pay-as-you-go credit packs',
                    '12-month illustrative expiry',
                    'Optional auto top-up',
                ],
                'cta_label' => 'Choose option',
                'cta_target' => 'create-account',
                'is_featured' => false,
                'sort_order' => 2,
                'is_active' => true,
                'monthly_api_calls' => 500,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'tagline' => 'For growing teams',
                'currency' => 'GBP',
                'amount' => 49,
                'amount_prefix' => null,
                'billing_period' => 'month',
                'custom_price_label' => null,
                'features' => [
                    'Demo monthly allowance',
                    'Projects and team roles',
                    'Usage controls and logs',
                ],
                'cta_label' => 'Choose option',
                'cta_target' => 'create-account',
                'is_featured' => true,
                'sort_order' => 3,
                'is_active' => true,
                'monthly_api_calls' => 10000,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'tagline' => 'For tailored requirements',
                'currency' => 'GBP',
                'amount' => null,
                'amount_prefix' => null,
                'billing_period' => null,
                'custom_price_label' => "Let's talk",
                'features' => [
                    'Commercial review',
                    'Dataset permission review',
                    'Support options',
                ],
                'cta_label' => 'Contact sales',
                'cta_target' => 'contact',
                'is_featured' => false,
                'sort_order' => 4,
                'is_active' => true,
                'monthly_api_calls' => null,
            ],
        ];

        foreach ($packages as $package) {
            PricingPackage::query()->updateOrCreate(
                ['slug' => $package['slug']],
                $package,
            );
        }
    }
}
