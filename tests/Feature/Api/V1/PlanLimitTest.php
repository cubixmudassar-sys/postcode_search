<?php

use App\Models\ApiKey;
use App\Models\Organisation;
use App\Models\Postcode;
use App\Models\PricingPackage;
use App\Models\Project;
use App\Models\UsageLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
uses(RefreshDatabase::class);

function seedBusinessPackage(int $monthlyLimit = 2): void
{
    PricingPackage::query()->create([
        'name' => 'Business',
        'slug' => 'business',
        'tagline' => 'Test',
        'currency' => 'GBP',
        'amount' => 49,
        'features' => [],
        'cta_label' => 'Choose',
        'cta_target' => 'create-account',
        'is_featured' => true,
        'sort_order' => 1,
        'is_active' => true,
        'monthly_api_calls' => $monthlyLimit,
    ]);
}

function makeOrgWithKey(): array
{
    seedBusinessPackage(2);

    $user = User::factory()->create();
    $org = Organisation::query()->create([
        'name' => 'Limit Co',
        'plan' => 'business',
        'credit_balance' => 50,
        'monthly_spend' => 0,
    ]);
    $org->users()->attach($user->id, ['role' => 'Owner']);

    $project = Project::query()->create([
        'organisation_id' => $org->id,
        'name' => 'API',
        'environment' => 'Test',
        'request_count' => 0,
    ]);

    $plain = 'pp_test_planlimitkey00000001';
    $apiKey = ApiKey::query()->create([
        'organisation_id' => $org->id,
        'project_id' => $project->id,
        'name' => 'Test key',
        'type' => 'Secret',
        'environment' => 'Test',
        'key_prefix' => substr($plain, 0, 16),
        'key_hash' => ApiKey::hashKey($plain),
    ]);

    return compact('user', 'org', 'project', 'apiKey', 'plain');
}

it('allows public lookups without authentication', function () {
    Postcode::query()->create([
        'postcode' => 'SW1A 2AA',
        'outward' => 'SW1A',
        'inward' => '2AA',
        'area' => 'SW',
        'post_town' => 'LONDON',
        'country' => 'England',
        'region' => 'London',
        'admin_district' => 'Westminster',
        'constituency' => 'Cities of London and Westminster',
        'nhs_region' => 'London',
        'ceremonial_county' => 'Greater London',
        'local_authority' => 'Westminster',
        'latitude' => 51.5,
        'longitude' => -0.1,
        'status' => 'current',
    ]);

    $this->getJson('/api/v1/public/postcodes/SW1A%202AA')
        ->assertOk()
        ->assertJsonPath('data.postcode', 'SW1A 2AA');
});

it('rejects metered lookups without authentication', function () {
    $this->getJson('/api/v1/postcodes/SW1A%202AA')
        ->assertUnauthorized();
});

it('meters lookups with an api key and records usage', function () {
    ['plain' => $plain, 'org' => $org] = makeOrgWithKey();

    Postcode::query()->create([
        'postcode' => 'SW1A 2AA',
        'outward' => 'SW1A',
        'inward' => '2AA',
        'area' => 'SW',
        'post_town' => 'LONDON',
        'country' => 'England',
        'region' => 'London',
        'admin_district' => 'Westminster',
        'constituency' => 'Cities of London and Westminster',
        'nhs_region' => 'London',
        'ceremonial_county' => 'Greater London',
        'local_authority' => 'Westminster',
        'latitude' => 51.5,
        'longitude' => -0.1,
        'status' => 'current',
    ]);

    $this->withToken($plain)
        ->getJson('/api/v1/postcodes/SW1A%202AA')
        ->assertOk()
        ->assertJsonPath('data.postcode', 'SW1A 2AA');

    $this->assertDatabaseHas('usage_logs', [
        'organisation_id' => $org->id,
        'endpoint' => 'Postcode lookup',
        'status' => '200',
    ]);
});

it('meters lookups with sanctum session for lookup explorer', function () {
    ['user' => $user, 'org' => $org] = makeOrgWithKey();

    Postcode::query()->create([
        'postcode' => 'SW1A 2AA',
        'outward' => 'SW1A',
        'inward' => '2AA',
        'area' => 'SW',
        'post_town' => 'LONDON',
        'country' => 'England',
        'region' => 'London',
        'admin_district' => 'Westminster',
        'constituency' => 'Cities of London and Westminster',
        'nhs_region' => 'London',
        'ceremonial_county' => 'Greater London',
        'local_authority' => 'Westminster',
        'latitude' => 51.5,
        'longitude' => -0.1,
        'status' => 'current',
    ]);

    $token = $user->createToken('explorer')->plainTextToken;

    $this->withToken($token)
        ->withHeader('X-Organisation-Id', (string) $org->id)
        ->getJson('/api/v1/postcodes/SW1A%202AA')
        ->assertOk();

    expect(UsageLog::query()->where('organisation_id', $org->id)->count())->toBe(1);
});

it('returns 429 when monthly plan limit is reached', function () {
    ['plain' => $plain, 'org' => $org, 'user' => $user, 'project' => $project] = makeOrgWithKey();

    UsageLog::query()->create([
        'organisation_id' => $org->id,
        'project_id' => $project->id,
        'user_id' => $user->id,
        'postcode' => 'SW1A 2AA',
        'location' => 'London',
        'endpoint' => 'Postcode lookup',
        'status' => '200',
        'outcome' => 'Billable',
        'cost' => 0.002,
        'latency_ms' => 10,
        'request_id' => 'req_limit1',
        'environment' => 'Test',
    ]);
    UsageLog::query()->create([
        'organisation_id' => $org->id,
        'project_id' => $project->id,
        'user_id' => $user->id,
        'postcode' => 'EC1A 1BB',
        'location' => 'London',
        'endpoint' => 'Postcode lookup',
        'status' => '200',
        'outcome' => 'Billable',
        'cost' => 0.002,
        'latency_ms' => 10,
        'request_id' => 'req_limit2',
        'environment' => 'Test',
    ]);

    Http::fake();

    $this->withToken($plain)
        ->getJson('/api/v1/postcodes/SW1A%202AA')
        ->assertStatus(429)
        ->assertJsonPath('message', 'Plan monthly API call limit reached.');
});

it('returns usage summary for authenticated organisations', function () {
    ['user' => $user, 'org' => $org] = makeOrgWithKey();

    $token = $user->createToken('summary')->plainTextToken;

    $this->withToken($token)
        ->withHeader('X-Organisation-Id', (string) $org->id)
        ->getJson('/api/v1/usage-summary')
        ->assertOk()
        ->assertJsonPath('data.plan', 'business')
        ->assertJsonPath('data.limit', 2)
        ->assertJsonPath('data.used', 0)
        ->assertJsonPath('data.used_test', 0)
        ->assertJsonPath('data.used_live', 0);
});
