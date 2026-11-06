<?php

use Illuminate\Support\Facades\Http;

it('shows the public canada address search page', function () {
    $this->get(route('search_address'))
        ->assertOk()
        ->assertSee('Canada address search')
        ->assertSee('Address or postal code');
});

it('returns 503 when the canada post key is missing for find', function () {
    config(['services.canadapost.key' => '']);

    $this->postJson(route('search_address.find'), ['search' => 'BC V3K'])
        ->assertStatus(503)
        ->assertJsonFragment(['message' => 'Canada Post AddressComplete API key is not configured.']);
});

it('proxies find suggestions from canada post with referer', function () {
    config([
        'services.canadapost.key' => 'test-key',
        'services.canadapost.referer' => null,
        'services.canadapost.find_url' => 'http://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws',
        'app.url' => 'http://localhost:8003',
    ]);

    Http::fake([
        'ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/*' => Http::response([
            'Items' => [
                [
                    'Id' => 'CA|CP|A|123',
                    'Text' => 'Shaw Ave Coquitlam BC V3K',
                    'Description' => '216 Addresses',
                    'Next' => 'Find',
                ],
            ],
        ]),
    ]);

    $this->withHeaders(['Referer' => 'http://localhost:8003/search_address'])
        ->postJson(route('search_address.find'), ['search' => 'BC V3K'])
        ->assertOk()
        ->assertJsonPath('Items.0.Id', 'CA|CP|A|123')
        ->assertJsonPath('Items.0.Next', 'Find');

    Http::assertSent(function ($request) {
        return str_starts_with($request->url(), 'http://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/')
            && $request->hasHeader('Referer', 'http://localhost:8003/search_address')
            && $request['SearchFor'] === 'Everything'
            && $request['LanguagePreference'] === 'EN'
            && $request['Origin'] === 'CAN'
            && $request['SearchTerm'] === 'BC V3K';
    });
});

it('falls back to app url referer when the browser omit it', function () {
    config([
        'services.canadapost.key' => 'test-key',
        'services.canadapost.referer' => null,
        'services.canadapost.find_url' => 'http://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws',
        'app.url' => 'http://localhost:8003',
    ]);

    Http::fake([
        'ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/*' => Http::response([
            'Items' => [],
        ]),
    ]);

    $this->postJson(route('search_address.find'), ['search' => 'BC V3K'])
        ->assertOk();

    Http::assertSent(function ($request) {
        return $request->hasHeader('Referer', 'http://localhost:8003/search_address');
    });
});

it('prefers the configured canada post referer over the browser referer', function () {
    config([
        'services.canadapost.key' => 'test-key',
        'services.canadapost.referer' => 'https://api.lookuppostcode.com/search_address',
        'services.canadapost.find_url' => 'http://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws',
    ]);

    Http::fake([
        'ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/*' => Http::response([
            'Items' => [],
        ]),
    ]);

    $this->withHeaders(['Referer' => 'http://localhost:8003/search_address'])
        ->postJson(route('search_address.find'), ['search' => 'BC V3K'])
        ->assertOk();

    Http::assertSent(function ($request) {
        return $request->hasHeader('Referer', 'https://api.lookuppostcode.com/search_address');
    });
});

it('proxies retrieve and returns the selected address', function () {
    config([
        'services.canadapost.key' => 'test-key',
        'services.canadapost.retrieve_url' => 'https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/v2.11/json3.ws',
    ]);

    Http::fake([
        'ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/*' => Http::response([
            'Items' => [
                [
                    'Id' => 'CA|CP|B|999',
                    'Label' => "100 Shaw Ave\nCoquitlam BC V3K 1A1",
                    'Line1' => '100 Shaw Ave',
                    'City' => 'Coquitlam',
                    'Province' => 'BC',
                    'PostalCode' => 'V3K 1A1',
                    'CountryName' => 'Canada',
                ],
            ],
        ]),
    ]);

    $this->postJson(route('search_address.retrieve'), ['id' => 'CA|CP|B|999'])
        ->assertOk()
        ->assertJsonPath('Item.PostalCode', 'V3K 1A1')
        ->assertJsonPath('Item.Line1', '100 Shaw Ave');

    Http::assertSent(function ($request) {
        return str_starts_with($request->url(), 'https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/');
    });
});

it('surfaces canada post find errors as 422', function () {
    config(['services.canadapost.key' => 'test-key']);

    Http::fake([
        'ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/*' => Http::response([
            'Items' => [
                [
                    'Error' => '1001',
                    'Description' => 'Invalid Key',
                    'Cause' => 'The Key provided is invalid.',
                    'Resolution' => 'Check your key.',
                ],
            ],
        ]),
    ]);

    $this->postJson(route('search_address.find'), ['search' => 'BC V3K'])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'Invalid Key']);
});

it('uses http find url when app env is local', function () {
    $scheme = env('APP_ENV', 'production') === 'local' ? 'http' : 'https';

    expect(config('services.canadapost.find_url'))
        ->toStartWith($scheme.'://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/');

    expect(config('services.canadapost.retrieve_url'))
        ->toStartWith($scheme.'://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/');
});
