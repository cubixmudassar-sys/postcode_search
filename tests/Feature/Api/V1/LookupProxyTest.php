<?php

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    Cache::flush();
    AppSetting::setValue(AppSetting::LOOKUP_PER_PAGE, '5');
    AppSetting::setValue(AppSetting::LOOKUP_PAGINATION_ENABLED, '1');
});

function sampleAddress(int $id = 7, string $postcode = 'AL1 1AJ'): array
{
    return [
        'id' => $id,
        'postcode' => $postcode,
        'online_id' => 'GB|RM|B|'.$id,
        'type' => 'Address',
        'address' => $id.' Orient Close',
        'description' => 'St. Albans, '.$postcode,
        'full_address' => $id.' Orient Close, St. Albans, '.$postcode,
    ];
}

it('proxies postcode addresses through laravel and hides the upstream host', function () {
    Http::fake([
        'lookup.qmaily.com/api/postcodes/*' => Http::response([
            'success' => true,
            'data' => [sampleAddress()],
            'meta' => [
                'postcode' => 'AL1 1AJ',
                'page' => 1,
                'per_page' => 5,
                'total' => 1,
                'total_pages' => 1,
                'has_next' => false,
                'has_prev' => false,
            ],
        ]),
    ]);

    $response = $this->getJson('/api/v1/public/postcodes/AL1%201AJ/addresses');

    $response->assertOk()
        ->assertJsonPath('data.0.postcode', 'AL1 1AJ')
        ->assertJsonPath('data.0.building', '7 Orient Close')
        ->assertJsonPath('meta.per_page', 5)
        ->assertJsonMissing(['lookup.qmaily.com']);

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'lookup.qmaily.com/api/postcodes/')
            && str_contains($request->url(), '/addresses')
            && $request['per_page'] == 5;
    });
});

it('requires a postcode when searching addresses', function () {
    $this->getJson('/api/v1/public/addresses?q=Block%20D')
        ->assertStatus(422)
        ->assertJsonPath('message', 'The postcode query parameter is required.');
});

it('proxies address search with postcode and optional q', function () {
    Http::fake([
        'lookup.qmaily.com/api/addresses*' => Http::response([
            'success' => true,
            'data' => [sampleAddress(34080, 'AL10 9WP')],
            'meta' => [
                'postcode' => 'AL10 9WP',
                'page' => 1,
                'per_page' => 5,
                'total' => 1,
                'total_pages' => 1,
                'has_next' => false,
                'has_prev' => false,
            ],
        ]),
    ]);

    $this->getJson('/api/v1/public/addresses?postcode=AL10%209WP&q=Block%20D')
        ->assertOk()
        ->assertJsonPath('data.0.id', 34080)
        ->assertJsonPath('data.0.online_id', 'GB|RM|B|34080');
});

it('proxies a single address by id', function () {
    Http::fake([
        'lookup.qmaily.com/api/addresses/3' => Http::response([
            'success' => true,
            'data' => sampleAddress(3, 'AL1 1AG'),
        ]),
    ]);

    $this->getJson('/api/v1/public/addresses/3')
        ->assertOk()
        ->assertJsonPath('data.id', 3)
        ->assertJsonPath('data.postcode', 'AL1 1AG');
});

it('fetches all pages when pagination is disabled', function () {
    AppSetting::setValue(AppSetting::LOOKUP_PAGINATION_ENABLED, '0');

    Http::fake([
        'lookup.qmaily.com/api/postcodes/*' => Http::sequence()
            ->push([
                'success' => true,
                'data' => [sampleAddress(1)],
                'meta' => [
                    'page' => 1,
                    'per_page' => 100,
                    'total' => 2,
                    'total_pages' => 2,
                    'has_next' => true,
                    'has_prev' => false,
                ],
            ])
            ->push([
                'success' => true,
                'data' => [sampleAddress(2)],
                'meta' => [
                    'page' => 2,
                    'per_page' => 100,
                    'total' => 2,
                    'total_pages' => 2,
                    'has_next' => false,
                    'has_prev' => true,
                ],
            ]),
    ]);

    $response = $this->getJson('/api/v1/public/postcodes/AL1%201AJ/addresses');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.pagination_enabled', false)
        ->assertJsonPath('meta.has_next', false);

    Http::assertSentCount(2);
});

it('requests a single page when page is provided even if pagination is disabled', function () {
    AppSetting::setValue(AppSetting::LOOKUP_PAGINATION_ENABLED, '0');

    Http::fake([
        'lookup.qmaily.com/api/postcodes/*' => Http::response([
            'success' => true,
            'data' => [sampleAddress(1)],
            'meta' => [
                'page' => 1,
                'per_page' => 5,
                'total' => 20,
                'total_pages' => 4,
                'has_next' => true,
                'has_prev' => false,
            ],
        ]),
    ]);

    $this->getJson('/api/v1/public/postcodes/AL1%201AJ/addresses?page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.page', 1)
        ->assertJsonPath('meta.has_next', true);

    Http::assertSentCount(1);
});

it('caches postcode suggestions briefly', function () {
    Http::fake([
        'lookup.qmaily.com/api/postcodes*' => Http::response([
            'success' => true,
            'data' => [
                [
                    'postcode' => 'AL1 1AJ',
                    'district' => 'St Albans',
                    'county' => 'Hertfordshire',
                    'region' => 'East of England',
                    'address_count' => 52,
                ],
            ],
            'meta' => [
                'page' => 1,
                'per_page' => 5,
                'total' => 1,
                'total_pages' => 1,
                'has_next' => false,
                'has_prev' => false,
            ],
        ]),
    ]);

    $this->getJson('/api/v1/public/postcodes/suggest?q=AL1')->assertOk();
    $this->getJson('/api/v1/public/postcodes/suggest?q=AL1')->assertOk()
        ->assertJsonPath('data.0.postcode', 'AL1 1AJ');

    Http::assertSentCount(1);
});

it('proxies postcode suggestions through laravel', function () {
    Http::fake([
        'lookup.qmaily.com/api/postcodes*' => Http::response([
            'success' => true,
            'data' => [
                [
                    'postcode' => 'AL1 1AJ',
                    'district' => 'St Albans',
                    'county' => 'Hertfordshire',
                    'region' => 'East of England',
                    'address_count' => 52,
                ],
            ],
            'meta' => [
                'page' => 1,
                'per_page' => 5,
                'total' => 1,
                'total_pages' => 1,
                'has_next' => false,
                'has_prev' => false,
            ],
        ]),
    ]);

    $this->getJson('/api/v1/public/postcodes/suggest?q=AL1')
        ->assertOk()
        ->assertJsonPath('data.0.postcode', 'AL1 1AJ')
        ->assertJsonPath('data.0.district', 'St Albans')
        ->assertJsonPath('data.0.address_count', 52)
        ->assertJsonMissing(['lookup.qmaily.com']);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'lookup.qmaily.com/api/postcodes')
        && ! str_contains($request->url(), '/addresses')
        && ($request['q'] ?? null) === 'AL1');
});

it('falls back to upstream postcode geography when local record is missing', function () {
    Http::fake([
        'lookup.qmaily.com/api/postcodes/*' => Http::response([
            'success' => true,
            'data' => [
                'id' => 2,
                'Postcode' => 'AL1 1AJ',
                'In_Use' => 'Yes',
                'Latitude' => '51.744498',
                'Longitude' => '-0.328599',
                'Easting' => '515491',
                'Northing' => '206410',
                'County' => 'Hertfordshire',
                'District' => 'St Albans',
                'Country' => 'England',
                'Constituency' => 'St Albans',
                'Region' => 'East of England',
                'Local_authority' => 'Hertfordshire',
                'Quality' => '1',
                'Last_updated' => '11/23/2019',
                'Postcode_area' => 'AL',
                'Postcode_district' => 'AL1',
            ],
        ]),
    ]);

    $this->getJson('/api/v1/public/postcodes/AL1%201AJ')
        ->assertOk()
        ->assertJsonPath('data.postcode', 'AL1 1AJ')
        ->assertJsonPath('data.admin_district', 'St Albans')
        ->assertJsonPath('data.country', 'England')
        ->assertJsonPath('data.latitude', '51.744498')
        ->assertJsonPath('data.source', 'lookup_provider');
});

it('allows staff to read and update api settings', function () {
    $admin = User::factory()->create([
        'is_staff' => true,
        'email' => 'admin@example.com',
        'password' => 'password123',
    ]);

    $token = $admin->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/v1/admin/api-settings')
        ->assertOk()
        ->assertJsonPath('data.per_page', 5)
        ->assertJsonPath('data.pagination_enabled', true);

    $this->withToken($token)
        ->patchJson('/api/v1/admin/api-settings', [
            'per_page' => 10,
            'pagination_enabled' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.per_page', 10)
        ->assertJsonPath('data.pagination_enabled', false);

    expect(AppSetting::lookupPerPage())->toBe(10);
    expect(AppSetting::lookupPaginationEnabled())->toBeFalse();
});
