<?php

use App\Models\PricingPackage;
use App\Models\User;
use Database\Seeders\PricingPackageSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function staffAuthHeaders(User $user): array
{
    return ['Authorization' => 'Bearer '.$user->createToken('auth')->plainTextToken];
}

it('lists active pricing packages publicly', function () {
    $this->seed(PricingPackageSeeder::class);

    PricingPackage::query()->where('slug', 'public')->update(['is_active' => false]);

    $response = $this->getJson('/api/v1/pricing-packages');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.name', 'Credits')
        ->assertJsonPath('data.1.price_display', '£49 / month')
        ->assertJsonPath('data.2.custom_price_label', "Let's talk");
});

it('allows staff to update package currency and amount', function () {
    $this->seed(PricingPackageSeeder::class);

    $staff = User::factory()->create(['is_staff' => true]);
    $package = PricingPackage::query()->where('slug', 'business')->firstOrFail();

    $this->withHeaders(staffAuthHeaders($staff))
        ->patchJson("/api/v1/admin/pricing-packages/{$package->id}", [
            'currency' => 'GBP',
            'amount' => 59,
        ])->assertOk()
        ->assertJsonPath('data.amount', '59.00')
        ->assertJsonPath('data.price_display', '£59 / month');

    $this->assertDatabaseHas('pricing_packages', [
        'id' => $package->id,
        'amount' => 59,
    ]);
});

it('rejects guest mutations of pricing packages', function () {
    $this->seed(PricingPackageSeeder::class);
    $package = PricingPackage::query()->where('slug', 'credits')->firstOrFail();

    $this->postJson('/api/v1/admin/pricing-packages', [
        'name' => 'Starter',
        'slug' => 'starter',
        'currency' => 'GBP',
        'amount' => 5,
        'cta_label' => 'Choose option',
        'cta_target' => 'create-account',
    ])->assertUnauthorized();

    $this->patchJson("/api/v1/admin/pricing-packages/{$package->id}", [
        'amount' => 20,
    ])->assertUnauthorized();

    $this->deleteJson("/api/v1/admin/pricing-packages/{$package->id}")
        ->assertUnauthorized();
});

it('allows staff to create and delete pricing packages', function () {
    $staff = User::factory()->create(['is_staff' => true]);
    $headers = staffAuthHeaders($staff);

    $create = $this->withHeaders($headers)->postJson('/api/v1/admin/pricing-packages', [
        'name' => 'Starter',
        'slug' => 'starter',
        'tagline' => 'For getting started',
        'currency' => 'GBP',
        'amount' => 5,
        'features' => ['Basic lookups'],
        'cta_label' => 'Choose option',
        'cta_target' => 'create-account',
        'sort_order' => 5,
    ]);

    $create->assertCreated()
        ->assertJsonPath('data.slug', 'starter')
        ->assertJsonPath('data.price_display', '£5');

    $id = $create->json('data.id');

    $this->withHeaders($headers)
        ->deleteJson("/api/v1/admin/pricing-packages/{$id}")
        ->assertOk();

    $this->assertDatabaseMissing('pricing_packages', ['id' => $id]);
});
