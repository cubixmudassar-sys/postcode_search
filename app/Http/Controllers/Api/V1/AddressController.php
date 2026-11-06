<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ApiUsageLimiter;
use App\Services\LookupApiClient;
use App\Services\PostcodeLookupService;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AddressController extends Controller
{
    public function __construct(
        private LookupApiClient $lookupApi,
        private PostcodeLookupService $lookup,
        private ApiUsageLimiter $limiter,
    ) {}

    public function search(Request $request): JsonResponse
    {
        $started = microtime(true);
        $postcode = (string) $request->query('postcode', '');
        $q = $request->query('q');
        $page = $request->query('page');
        $environment = RequestContext::environment($request);
        $organisation = RequestContext::organisation($request);
        $project = RequestContext::project($request);
        $user = $request->user();

        if ($organisation) {
            $this->limiter->assertWithinLimit($organisation);
        }

        if (trim($postcode) === '') {
            return response()->json([
                'message' => 'The postcode query parameter is required.',
                'errors' => ['postcode' => ['The postcode field is required.']],
            ], 422);
        }

        try {
            $result = $this->lookupApi->searchAddresses(
                $postcode,
                is_string($q) ? $q : null,
                is_numeric($page) ? (int) $page : null,
            );
        } catch (RuntimeException $e) {
            if ($organisation) {
                $this->lookup->recordUsage(
                    endpoint: 'Address lookup',
                    status: (string) (is_int($e->getCode()) && $e->getCode() >= 400 ? $e->getCode() : 502),
                    outcome: 'Not billed',
                    cost: '0.0000',
                    latencyMs: (int) round((microtime(true) - $started) * 1000),
                    postcode: $this->lookup->normalize($postcode) ?? strtoupper($postcode),
                    location: null,
                    environment: $environment,
                    organisation: $organisation,
                    project: $project,
                    user: $user,
                );
            }

            return $this->providerErrorResponse($e);
        }

        $latencyMs = (int) round((microtime(true) - $started) * 1000);
        $this->billAddressLookup(
            $result['data'],
            $latencyMs,
            $environment,
            $organisation,
            $project,
            $user,
            $postcode,
        );

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $started = microtime(true);
        $environment = RequestContext::environment($request);
        $organisation = RequestContext::organisation($request);
        $project = RequestContext::project($request);
        $user = $request->user();

        if ($organisation) {
            $this->limiter->assertWithinLimit($organisation);
        }

        try {
            $address = $this->lookupApi->getAddress($id);
        } catch (RuntimeException $e) {
            if ($organisation) {
                $this->lookup->recordUsage(
                    endpoint: 'Address lookup',
                    status: (string) (is_int($e->getCode()) && $e->getCode() >= 400 ? $e->getCode() : 502),
                    outcome: 'Not billed',
                    cost: '0.0000',
                    latencyMs: (int) round((microtime(true) - $started) * 1000),
                    postcode: null,
                    location: null,
                    environment: $environment,
                    organisation: $organisation,
                    project: $project,
                    user: $user,
                );
            }

            return $this->providerErrorResponse($e);
        }

        $latencyMs = (int) round((microtime(true) - $started) * 1000);
        $this->billAddressLookup(
            [$address],
            $latencyMs,
            $environment,
            $organisation,
            $project,
            $user,
            (string) ($address['postcode'] ?? ''),
        );

        return response()->json([
            'data' => $address,
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $addresses
     */
    private function billAddressLookup(
        array $addresses,
        int $latencyMs,
        string $environment,
        mixed $organisation,
        mixed $project,
        mixed $user,
        string $fallbackPostcode,
    ): void {
        if (! $organisation) {
            return;
        }

        $first = $addresses[0] ?? null;
        $postcode = (string) ($first['postcode'] ?? $fallbackPostcode);
        $postcodeRecord = $this->lookup->findPostcode($postcode);
        $billable = $environment === 'Live' && $first !== null;
        $cost = $billable ? PostcodeLookupService::ADDRESS_COST : '0.0000';
        $outcome = $billable ? 'Billable' : 'Not billed';

        $this->lookup->recordUsage(
            endpoint: 'Address lookup',
            status: '200',
            outcome: $outcome,
            cost: $cost,
            latencyMs: $latencyMs,
            postcode: $this->lookup->normalize($postcode) ?? strtoupper($postcode),
            location: $this->lookup->locationLabel($postcodeRecord) ?? ($first['post_town'] ?? null),
            environment: $environment,
            organisation: $organisation,
            project: $project,
            user: $user,
        );

        if ($billable) {
            $this->lookup->billIfLive($organisation, $cost, $environment, true);
        }
        $project?->increment('request_count');
    }

    private function providerErrorResponse(RuntimeException $e): JsonResponse
    {
        $status = $e->getCode();
        if (! is_int($status) || $status < 400 || $status > 599) {
            $status = 502;
        }

        if ($status === 404) {
            throw new NotFoundHttpException($e->getMessage());
        }

        if ($status === 422) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        if ($status >= 500) {
            throw new HttpException($status, $e->getMessage());
        }

        return response()->json([
            'message' => $e->getMessage(),
        ], $status);
    }
}
