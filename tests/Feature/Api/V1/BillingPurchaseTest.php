<?php

use App\Models\Organisation;
use App\Models\OrganisationBillingTransaction;
use App\Models\PricingPackage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function seedBillingPackages(): array
{
    $free = PricingPackage::query()->create([
        'name' => 'Public',
        'slug' => 'public',
        'tagline' => 'Free',
        'currency' => 'GBP',
        'amount' => 0,
        'features' => [],
        'cta_label' => 'Choose',
        'cta_target' => 'create-account',
        'is_featured' => false,
        'sort_order' => 1,
        'is_active' => true,
        'monthly_api_calls' => 100,
    ]);

    $paid = PricingPackage::query()->create([
        'name' => 'Business',
        'slug' => 'business',
        'tagline' => 'Paid',
        'currency' => 'GBP',
        'amount' => 49,
        'billing_period' => 'month',
        'features' => [],
        'cta_label' => 'Choose',
        'cta_target' => 'create-account',
        'is_featured' => true,
        'sort_order' => 2,
        'is_active' => true,
        'monthly_api_calls' => 10000,
    ]);

    return compact('free', 'paid');
}

/**
 * @return array{user: User, org: Organisation}
 */
function makeBillingOrg(array $overrides = []): array
{
    seedBillingPackages();

    $user = User::factory()->create();
    $org = Organisation::query()->create(array_merge([
        'name' => 'Billing Co',
        'plan' => 'public',
        'credit_balance' => 10,
        'monthly_spend' => 0,
        'billing_phone' => '03001234567',
    ], $overrides));
    $org->users()->attach($user->id, ['role' => 'Owner']);

    return compact('user', 'org');
}

/**
 * @return array<string, string>
 */
function authHeaders(User $user, Organisation $org): array
{
    return [
        'Authorization' => 'Bearer '.$user->createToken('billing-test')->plainTextToken,
        'X-Organisation-Id' => (string) $org->id,
    ];
}

beforeEach(function () {
    config([
        'lotpayment.client_id' => 'test-client',
        'lotpayment.mode' => 'sandbox',
        'lotpayment.api_url' => 'https://api.lotpayment.com/api/test/transactions/create',
        'lotpayment.checkout_url' => 'https://lotpayment.com/test/checkout?basket_id={basket_id}',
        'lotpayment.use_server_api' => true,
        'lotpayment.fallback_to_form_post_on_connection_error' => false,
        'lotpayment.amount_as_integer' => true,
        'lotpayment.currency' => 'GBP',
        'lotpayment.gateway_return_url' => 'http://localhost:8443/payment/lotpayment/callback',
        'lotpayment.result_url' => 'http://localhost:8443/payment/result',
        'lotpayment.http_force_ipv4' => false,
        'lotpayment.http_retries' => 0,
    ]);
});

it('initiates a paid plan purchase and returns a checkout url', function () {
    ['user' => $user, 'org' => $org] = makeBillingOrg();
    $paid = PricingPackage::query()->where('slug', 'business')->firstOrFail();

    Http::fake([
        'api.lotpayment.com/*' => Http::response([
            'success' => true,
            'data' => [
                'basket_id' => 'BASKET123',
                'checkout_url' => 'https://lotpayment.com/test/checkout?basket_id=BASKET123',
            ],
        ], 201),
    ]);

    $response = $this->postJson('/api/v1/billing/purchase', [
        'package_id' => $paid->id,
    ], authHeaders($user, $org));

    $response->assertCreated()
        ->assertJsonPath('data.redirect_method', 'redirect')
        ->assertJsonPath('data.payment_url', 'https://lotpayment.com/test/checkout?basket_id=BASKET123');

    $this->assertDatabaseHas('organisation_billing_transactions', [
        'organisation_id' => $org->id,
        'pricing_package_id' => $paid->id,
        'status' => 'pending',
        'basket_id' => 'BASKET123',
    ]);
});

it('prefers the hosted checkout url when a gateway paymentUrl is also returned', function () {
    ['user' => $user, 'org' => $org] = makeBillingOrg();
    $paid = PricingPackage::query()->where('slug', 'business')->firstOrFail();

    Http::fake([
        'api.lotpayment.com/*' => Http::response([
            'success' => true,
            'data' => [
                'basket_id' => 'NQ5kEgd4',
                'paymentUrl' => 'https://safepay.example/pay/direct',
                'checkout_url' => 'https://lotpayment.com/test/checkout?basket_id=NQ5kEgd4',
            ],
        ], 201),
    ]);

    $this->postJson('/api/v1/billing/purchase', [
        'package_id' => $paid->id,
    ], authHeaders($user, $org))
        ->assertCreated()
        ->assertJsonPath('data.redirect_method', 'redirect')
        ->assertJsonPath('data.payment_url', 'https://lotpayment.com/test/checkout?basket_id=NQ5kEgd4');

    $this->assertDatabaseHas('organisation_billing_transactions', [
        'organisation_id' => $org->id,
        'pricing_package_id' => $paid->id,
        'status' => 'pending',
        'basket_id' => 'NQ5kEgd4',
    ]);
});

it('rejects purchase without a billing phone', function () {
    ['user' => $user, 'org' => $org] = makeBillingOrg(['billing_phone' => null]);
    $paid = PricingPackage::query()->where('slug', 'business')->firstOrFail();

    $this->postJson('/api/v1/billing/purchase', [
        'package_id' => $paid->id,
    ], authHeaders($user, $org))->assertStatus(422)
        ->assertJsonPath('message', 'Please add a valid billing phone number before purchasing a plan.');
});

it('blocks paid plan changes through billing patch', function () {
    ['user' => $user, 'org' => $org] = makeBillingOrg();

    $this->patchJson('/api/v1/billing', [
        'plan' => 'business',
    ], authHeaders($user, $org))->assertStatus(422)
        ->assertJsonPath('message', 'Paid plans must be purchased through checkout.');
});

it('activates organisation plan after successful lotpayment callback', function () {
    ['user' => $user, 'org' => $org] = makeBillingOrg();
    $paid = PricingPackage::query()->where('slug', 'business')->firstOrFail();

    Http::fake([
        'api.lotpayment.com/*' => Http::response([
            'success' => true,
            'data' => [
                'basket_id' => 'BASKET999',
                'checkout_url' => 'https://lotpayment.com/test/checkout?basket_id=BASKET999',
            ],
        ], 201),
    ]);

    $purchase = $this->postJson('/api/v1/billing/purchase', [
        'package_id' => $paid->id,
    ], authHeaders($user, $org))->assertCreated();

    $transactionId = $purchase->json('data.transaction_id');

    $this->getJson('/api/v1/payment/lotpayment/callback?'.http_build_query([
        'customer_transaction_id' => $transactionId,
        'status' => 'success',
        'basket_id' => 'BASKET999',
    ]))->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure(['redirect_url']);

    expect($org->fresh()->plan)->toBe('business');

    $this->assertDatabaseHas('organisation_billing_transactions', [
        'customer_transaction_id' => $transactionId,
        'status' => OrganisationBillingTransaction::STATUS_COMPLETED,
    ]);
});

it('leaves plan unchanged when payment callback reports failure', function () {
    ['user' => $user, 'org' => $org] = makeBillingOrg();
    $paid = PricingPackage::query()->where('slug', 'business')->firstOrFail();

    Http::fake([
        'api.lotpayment.com/*' => Http::response([
            'success' => true,
            'data' => [
                'basket_id' => 'BASKETFAIL',
                'checkout_url' => 'https://lotpayment.com/test/checkout?basket_id=BASKETFAIL',
            ],
        ], 201),
    ]);

    $purchase = $this->postJson('/api/v1/billing/purchase', [
        'package_id' => $paid->id,
    ], authHeaders($user, $org))->assertCreated();

    $transactionId = $purchase->json('data.transaction_id');

    $this->getJson('/api/v1/payment/lotpayment/callback?'.http_build_query([
        'customer_transaction_id' => $transactionId,
        'status' => 'failure',
        'err_msg' => 'Declined',
    ]))->assertOk()
        ->assertJsonPath('status', 'failure');

    expect($org->fresh()->plan)->toBe('public');

    $this->assertDatabaseHas('organisation_billing_transactions', [
        'customer_transaction_id' => $transactionId,
        'status' => OrganisationBillingTransaction::STATUS_FAILED,
    ]);
});
