<?php

use App\Models\Postcode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('registers a customer workspace and returns a sanctum token', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'first_name' => 'Taylor',
        'last_name' => 'Otwell',
        'email' => 'taylor@example.com',
        'password' => 'password123',
        'use_case' => 'Validate UK postcodes',
        'organisation_name' => 'Acme Ltd',
        'project_name' => 'Checkout',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.user.email', 'taylor@example.com')
        ->assertJsonStructure(['data' => ['token', 'user', 'organisation']]);

    $this->assertDatabaseHas('users', ['email' => 'taylor@example.com']);
    $this->assertDatabaseHas('organisations', ['name' => 'Acme Ltd']);
});

it('logs in an existing user', function () {
    $user = User::factory()->create([
        'email' => 'emma@example.com',
        'password' => 'demopassword',
        'first_name' => 'Emma',
        'last_name' => 'Morgan',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'demopassword',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.user.email', 'emma@example.com')
        ->assertJsonStructure(['data' => ['token', 'user']]);
});

it('rejects seeded demo account credentials', function () {
    User::factory()->create([
        'email' => 'emma@northstar.demo',
        'password' => 'demopassword',
        'first_name' => 'Emma',
        'last_name' => 'Morgan',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'emma@northstar.demo',
        'password' => 'demopassword',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Invalid credentials.');
});

it('looks up a seeded postcode publicly', function () {
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
        'latitude' => 51.50354,
        'longitude' => -0.12767,
        'eastings' => 530047,
        'northings' => 179951,
        'quality' => 1,
        'status' => 'current',
        'source' => 'test',
        'record_updated' => now()->toDateString(),
    ]);

    $this->getJson('/api/v1/public/postcodes/SW1A%202AA')
        ->assertOk()
        ->assertJsonPath('data.postcode', 'SW1A 2AA')
        ->assertJsonPath('data.country', 'England');
});
