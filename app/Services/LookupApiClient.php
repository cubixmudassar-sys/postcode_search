<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class LookupApiClient
{
    private const CACHE_TTL_SECONDS = 60;

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function listPostcodeAddresses(string $postcode, ?int $page = null, ?string $q = null): array
    {
        $normalized = $this->normalizePostcode($postcode) ?? trim($postcode);
        $path = '/postcodes/'.rawurlencode($normalized).'/addresses';

        return $this->rememberLookup(
            $this->addressCacheKey('list', $normalized, $q, $page),
            fn () => $this->fetchAddressList($path, [
                'q' => $q,
                'page' => $page,
            ], ['postcode' => $normalized]),
        );
    }

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function searchAddresses(string $postcode, ?string $q = null, ?int $page = null): array
    {
        $normalized = $this->normalizePostcode($postcode) ?? trim($postcode);

        return $this->rememberLookup(
            $this->addressCacheKey('search', $normalized, $q, $page),
            fn () => $this->fetchAddressList('/addresses', [
                'postcode' => $normalized,
                'q' => $q,
                'page' => $page,
            ], ['postcode' => $normalized]),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function getAddress(int $id): array
    {
        $payload = $this->request('GET', '/addresses/'.$id);

        if (! ($payload['success'] ?? false) || ! isset($payload['data']) || ! is_array($payload['data'])) {
            throw new RuntimeException('Unexpected address response from lookup provider.');
        }

        return $this->mapAddress($payload['data']);
    }

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function suggestPostcodes(string $query, ?int $page = null): array
    {
        $term = trim($query);
        if ($term === '') {
            return [
                'data' => [],
                'meta' => [
                    'page' => 1,
                    'per_page' => AppSetting::lookupPerPage(),
                    'total' => 0,
                    'total_pages' => 0,
                    'has_next' => false,
                    'has_prev' => false,
                    'pagination_enabled' => AppSetting::lookupPaginationEnabled(),
                ],
            ];
        }

        $page = max(1, $page ?? 1);
        $cacheKey = 'lookup.suggest.'.md5(strtoupper(preg_replace('/\s+/', '', $term) ?? '').'|'.$page);

        return $this->rememberLookup($cacheKey, function () use ($term, $page) {
            $paginationEnabled = AppSetting::lookupPaginationEnabled();
            $perPage = AppSetting::lookupPerPage();

            $requestQuery = array_filter([
                'q' => $term,
                'page' => $page,
                'per_page' => $paginationEnabled ? $perPage : 100,
            ], fn ($value) => $value !== null && $value !== '');

            $payload = $this->request('GET', '/postcodes', $requestQuery);
            $items = $this->extractDataList($payload);
            $meta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];

            return [
                'data' => array_map(fn (array $item) => $this->mapPostcodeSuggestion($item), $items),
                'meta' => [
                    'page' => (int) ($meta['page'] ?? $page),
                    'per_page' => (int) ($meta['per_page'] ?? $perPage),
                    'total' => (int) ($meta['total'] ?? count($items)),
                    'total_pages' => (int) ($meta['total_pages'] ?? 1),
                    'has_next' => (bool) ($meta['has_next'] ?? false),
                    'has_prev' => (bool) ($meta['has_prev'] ?? false),
                    'pagination_enabled' => $paginationEnabled,
                ],
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function getPostcode(string $postcode): array
    {
        $normalized = $this->normalizePostcode($postcode) ?? trim($postcode);
        $payload = $this->request('GET', '/postcodes/'.rawurlencode($normalized));

        if (! ($payload['success'] ?? false) || ! isset($payload['data']) || ! is_array($payload['data'])) {
            throw new RuntimeException('Unexpected postcode response from lookup provider.', 404);
        }

        return $this->mapPostcode($payload['data']);
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    public function mapPostcodeSuggestion(array $item): array
    {
        $postcode = (string) ($item['postcode'] ?? '');
        $normalized = $this->normalizePostcode($postcode) ?? $postcode;
        $district = (string) ($item['district'] ?? '');
        $county = (string) ($item['county'] ?? '');
        $region = (string) ($item['region'] ?? '');
        $parts = $this->splitPostcodeParts($normalized);

        return [
            'postcode' => $normalized,
            'outward' => $parts['outward'],
            'inward' => $parts['inward'],
            'area' => $parts['area'],
            'post_town' => $district !== '' ? strtoupper($district) : '',
            'country' => '',
            'region' => $region,
            'admin_district' => $district,
            'constituency' => '',
            'nhs_region' => '',
            'ceremonial_county' => $county,
            'local_authority' => $district,
            'latitude' => null,
            'longitude' => null,
            'eastings' => null,
            'northings' => null,
            'quality' => null,
            'status' => 'current',
            'source' => 'lookup_provider',
            'record_updated' => null,
            'district' => $district !== '' ? $district : null,
            'county' => $county !== '' ? $county : null,
            'address_count' => isset($item['address_count']) ? (int) $item['address_count'] : null,
            'coordinates' => [
                'latitude' => null,
                'longitude' => null,
                'precision' => 'postcode_centroid',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    public function mapPostcode(array $item): array
    {
        $rawPostcode = (string) ($item['Postcode'] ?? $item['postcode'] ?? '');
        $normalized = $this->normalizePostcode($rawPostcode) ?? $rawPostcode;
        $parts = $this->splitPostcodeParts($normalized);
        $district = (string) ($item['District'] ?? $item['district'] ?? '');
        $country = (string) ($item['Country'] ?? $item['country'] ?? '');
        $region = (string) ($item['Region'] ?? $item['region'] ?? '');
        $constituency = (string) ($item['Constituency'] ?? $item['constituency'] ?? '');
        $county = (string) ($item['County'] ?? $item['county'] ?? '');
        $localAuthority = (string) ($item['Local_authority'] ?? $item['local_authority'] ?? $district);
        $latitude = $item['Latitude'] ?? $item['latitude'] ?? null;
        $longitude = $item['Longitude'] ?? $item['longitude'] ?? null;
        $inUse = strtolower((string) ($item['In_Use'] ?? 'Yes'));

        return [
            'postcode' => $normalized,
            'outward' => $parts['outward'] !== '' ? $parts['outward'] : (string) ($item['Postcode_district'] ?? ''),
            'inward' => $parts['inward'],
            'area' => $parts['area'] !== '' ? $parts['area'] : (string) ($item['Postcode_area'] ?? ''),
            'post_town' => $district !== '' ? strtoupper($district) : '',
            'country' => $country,
            'region' => $region,
            'admin_district' => $district,
            'constituency' => $constituency,
            'nhs_region' => $region,
            'ceremonial_county' => $county,
            'local_authority' => $localAuthority,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'eastings' => $item['Easting'] ?? $item['eastings'] ?? null,
            'northings' => $item['Northing'] ?? $item['northings'] ?? null,
            'quality' => $item['Quality'] ?? $item['quality'] ?? null,
            'status' => $inUse === 'yes' || $inUse === '' ? 'current' : 'terminated',
            'source' => 'lookup_provider',
            'record_updated' => $this->normalizeProviderDate($item['Last_updated'] ?? $item['record_updated'] ?? null),
            'coordinates' => [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'precision' => 'postcode_centroid',
            ],
        ];
    }

    /**
     * @return array{outward: string, inward: string, area: string}
     */
    protected function splitPostcodeParts(string $postcode): array
    {
        $normalized = $this->normalizePostcode($postcode);
        if (! $normalized) {
            return ['outward' => '', 'inward' => '', 'area' => ''];
        }

        [$outward, $inward] = explode(' ', $normalized, 2);
        $area = preg_replace('/\d.*$/', '', $outward) ?? '';

        return [
            'outward' => $outward,
            'inward' => $inward,
            'area' => $area,
        ];
    }

    protected function normalizeProviderDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $raw = (string) $value;
        $timestamp = strtotime($raw);

        return $timestamp ? date('Y-m-d', $timestamp) : $raw;
    }

    /**
     * @param  array<string, mixed>  $query
     * @param  array<string, mixed>  $metaDefaults
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    protected function fetchAddressList(string $path, array $query, array $metaDefaults = []): array
    {
        $paginationEnabled = AppSetting::lookupPaginationEnabled();
        $perPage = AppSetting::lookupPerPage();
        $pageProvided = array_key_exists('page', $query) && $query['page'] !== null && $query['page'] !== '';

        // Dropdown / paged callers pass an explicit page and must stay on one provider request.
        if (! $paginationEnabled && ! $pageProvided) {
            return $this->fetchAllPages($path, $query, $metaDefaults);
        }

        $page = max(1, (int) ($query['page'] ?? 1));
        $requestQuery = array_filter([
            ...$this->baseQueryWithoutPage($query),
            'page' => $page,
            'per_page' => $perPage,
        ], fn ($value) => $value !== null && $value !== '');

        $payload = $this->request('GET', $path, $requestQuery);
        $items = $this->extractDataList($payload);
        $meta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];

        return [
            'data' => array_map(fn (array $item) => $this->mapAddress($item), $items),
            'meta' => array_merge($metaDefaults, [
                'page' => (int) ($meta['page'] ?? $page),
                'per_page' => (int) ($meta['per_page'] ?? $perPage),
                'total' => (int) ($meta['total'] ?? count($items)),
                'total_pages' => (int) ($meta['total_pages'] ?? 1),
                'has_next' => (bool) ($meta['has_next'] ?? false),
                'has_prev' => (bool) ($meta['has_prev'] ?? false),
                'pagination_enabled' => $paginationEnabled,
            ]),
        ];
    }

    /**
     * @param  callable(): array{data: list<array<string, mixed>>, meta: array<string, mixed>}  $callback
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    protected function rememberLookup(string $key, callable $callback): array
    {
        /** @var array{data: list<array<string, mixed>>, meta: array<string, mixed>} $result */
        $result = Cache::remember($key, self::CACHE_TTL_SECONDS, $callback);

        return $result;
    }

    protected function addressCacheKey(string $scope, string $postcode, ?string $q, ?int $page): string
    {
        $normalizedPostcode = strtoupper(preg_replace('/\s+/', '', $postcode) ?? '');
        $normalizedQuery = strtoupper(preg_replace('/\s+/', '', trim((string) $q)) ?? '');
        $paginationEnabled = AppSetting::lookupPaginationEnabled();
        $pageKey = $page === null
            ? ($paginationEnabled ? '1' : 'all')
            : (string) max(1, $page);
        $perPage = AppSetting::lookupPerPage();

        return 'lookup.addresses.'.$scope.'.'.md5(
            $normalizedPostcode.'|'.$normalizedQuery.'|'.$pageKey.'|'.($paginationEnabled ? '1' : '0').'|'.$perPage
        );
    }

    /**
     * @param  array<string, mixed>  $query
     * @param  array<string, mixed>  $metaDefaults
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    protected function fetchAllPages(string $path, array $query, array $metaDefaults = []): array
    {
        $page = 1;
        $all = [];
        $lastMeta = [];
        $maxPages = 50;

        do {
            $requestQuery = array_filter([
                ...$this->baseQueryWithoutPage($query),
                'page' => $page,
                'per_page' => 100,
            ], fn ($value) => $value !== null && $value !== '');

            $payload = $this->request('GET', $path, $requestQuery);
            $items = $this->extractDataList($payload);
            $lastMeta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];
            $all = array_merge($all, $items);
            $hasNext = (bool) ($lastMeta['has_next'] ?? false);
            $page++;
        } while ($hasNext && $page <= $maxPages);

        $total = (int) ($lastMeta['total'] ?? count($all));

        return [
            'data' => array_map(fn (array $item) => $this->mapAddress($item), $all),
            'meta' => array_merge($metaDefaults, [
                'page' => 1,
                'per_page' => count($all),
                'total' => $total,
                'total_pages' => 1,
                'has_next' => false,
                'has_prev' => false,
                'pagination_enabled' => false,
            ]),
        ];
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    protected function baseQueryWithoutPage(array $query): array
    {
        unset($query['page'], $query['per_page']);

        return $query;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<array<string, mixed>>
     */
    protected function extractDataList(array $payload): array
    {
        if (! ($payload['success'] ?? false)) {
            $message = is_array($payload['error'] ?? null)
                ? (string) ($payload['error']['message'] ?? 'Lookup provider error')
                : 'Lookup provider error';

            throw new RuntimeException($message);
        }

        $data = $payload['data'] ?? [];
        if (! is_array($data)) {
            return [];
        }

        return array_values(array_filter($data, 'is_array'));
    }

    /**
     * @param  array<string, string|int|null>  $query
     * @return array<string, mixed>
     */
    protected function request(string $method, string $path, array $query = []): array
    {
        $baseUrl = rtrim((string) config('services.lookup.base_url'), '/');
        $timeout = (int) config('services.lookup.timeout', 15);

        if ($baseUrl === '') {
            throw new RuntimeException('Lookup API base URL is not configured.');
        }

        $filteredQuery = array_filter(
            $query,
            fn ($value) => $value !== null && $value !== '',
        );

        try {
            $pending = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->timeout($timeout);

            $response = strtoupper($method) === 'GET'
                ? $pending->get($path, $filteredQuery)
                : $pending->send($method, $path, ['query' => $filteredQuery]);

            $response->throw();
        } catch (ConnectionException $e) {
            throw new RuntimeException('Unable to reach lookup provider.', 0, $e);
        } catch (RequestException $e) {
            $status = $e->response?->status() ?? 502;
            $body = $e->response?->json();
            $message = is_array($body) && isset($body['error']['message'])
                ? (string) $body['error']['message']
                : 'Lookup provider request failed.';

            throw new RuntimeException($message, $status, $e);
        }

        $json = $response->json();

        return is_array($json) ? $json : [];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    public function mapAddress(array $item): array
    {
        $addressLine = (string) ($item['address'] ?? '');
        $description = (string) ($item['description'] ?? '');
        $fullAddress = (string) ($item['full_address'] ?? '');
        $postTown = $this->extractPostTown($description, $fullAddress, $addressLine);

        return [
            'id' => isset($item['id']) ? (int) $item['id'] : null,
            'postcode' => (string) ($item['postcode'] ?? ''),
            'building' => $addressLine,
            'line1' => $addressLine,
            'locality' => null,
            'post_town' => $postTown,
            'uprn' => null,
            'online_id' => $item['online_id'] ?? null,
            'type' => $item['type'] ?? null,
            'description' => $description !== '' ? $description : null,
            'full_address' => $fullAddress !== '' ? $fullAddress : ($addressLine !== '' ? $addressLine : null),
            'latitude' => null,
            'longitude' => null,
            'precision' => null,
        ];
    }

    protected function extractPostTown(string $description, string $fullAddress, string $addressLine): string
    {
        if ($description !== '' && str_contains($description, ',')) {
            return trim(explode(',', $description)[0]);
        }

        if ($fullAddress !== '') {
            $parts = array_values(array_filter(array_map('trim', explode(',', $fullAddress))));
            if (count($parts) >= 2) {
                return $parts[count($parts) - 2];
            }
        }

        return $addressLine !== '' ? '' : '';
    }

    public function normalizePostcode(?string $postcode): ?string
    {
        if ($postcode === null || trim($postcode) === '') {
            return null;
        }

        $compact = strtoupper(preg_replace('/\s+/', '', trim($postcode)) ?? '');

        if (! preg_match('/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/', $compact)) {
            return null;
        }

        $inward = substr($compact, -3);
        $outward = substr($compact, 0, -3);

        return $outward.' '.$inward;
    }
}
