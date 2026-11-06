<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PostcodeResource;
use App\Services\ApiUsageLimiter;
use App\Services\LookupApiClient;
use App\Services\PostcodeLookupService;
use App\Support\RequestContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PostcodeController extends Controller
{
    public function __construct(
        private PostcodeLookupService $lookup,
        private LookupApiClient $lookupApi,
        private ApiUsageLimiter $limiter,
    ) {}

    public function show(Request $request, string $postcode): JsonResponse
    {
        $started = microtime(true);
        $environment = RequestContext::environment($request);
        $organisation = RequestContext::organisation($request);
        $project = RequestContext::project($request);
        $user = $request->user();

        if ($organisation) {
            $this->limiter->assertWithinLimit($organisation);
        }

        $record = $this->lookup->findPostcode($postcode);
        $upstreamRecord = null;

        if (! $record) {
            try {
                $upstreamRecord = $this->lookupApi->getPostcode($postcode);
            } catch (RuntimeException $e) {
                $latencyMs = (int) round((microtime(true) - $started) * 1000);

                if ($organisation) {
                    $this->lookup->recordUsage(
                        endpoint: 'Postcode lookup',
                        status: '404',
                        outcome: 'Not billed',
                        cost: '0.0000',
                        latencyMs: $latencyMs,
                        postcode: $this->lookup->normalize($postcode) ?? strtoupper($postcode),
                        location: 'No matching postcode',
                        environment: $environment,
                        organisation: $organisation,
                        project: $project,
                        user: $user,
                    );
                }

                $status = $e->getCode();
                if (is_int($status) && $status >= 400 && $status < 600) {
                    if ($status === 404) {
                        return response()->json(['message' => 'Postcode not found.'], 404);
                    }

                    throw new HttpException($status, $e->getMessage());
                }

                return response()->json(['message' => 'Postcode not found.'], 404);
            }
        }

        $latencyMs = (int) round((microtime(true) - $started) * 1000);
        $billable = $environment === 'Live';
        $cost = $billable ? PostcodeLookupService::POSTCODE_COST : '0.0000';
        $outcome = $billable ? 'Billable' : 'Not billed';

        if ($organisation) {
            $normalized = $record?->postcode
                ?? ($upstreamRecord['postcode'] ?? ($this->lookup->normalize($postcode) ?? strtoupper($postcode)));
            $location = $record
                ? $this->lookup->locationLabel($record)
                : trim(implode(', ', array_filter([
                    $upstreamRecord['admin_district'] ?? null,
                    $upstreamRecord['post_town'] ?? null,
                ])));

            $this->lookup->recordUsage(
                endpoint: 'Postcode lookup',
                status: '200',
                outcome: $outcome,
                cost: $cost,
                latencyMs: $latencyMs,
                postcode: $normalized,
                location: $location !== '' ? $location : null,
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

        if ($record) {
            return response()->json([
                'data' => new PostcodeResource($record),
            ]);
        }

        return response()->json([
            'data' => $upstreamRecord,
        ]);
    }

    public function suggest(Request $request): JsonResponse
    {
        $started = microtime(true);
        $query = (string) $request->query('q', '');
        $page = $request->query('page');
        $environment = RequestContext::environment($request);
        $organisation = RequestContext::organisation($request);
        $project = RequestContext::project($request);
        $user = $request->user();

        if ($organisation) {
            $this->limiter->assertWithinLimit($organisation);
        }

        if (trim($query) === '') {
            return response()->json(['data' => []]);
        }

        try {
            $result = $this->lookupApi->suggestPostcodes(
                $query,
                is_numeric($page) ? (int) $page : null,
            );
        } catch (RuntimeException $e) {
            $status = $e->getCode();
            if (! is_int($status) || $status < 400 || $status > 599) {
                $status = 502;
            }

            if ($status === 404) {
                throw new NotFoundHttpException($e->getMessage());
            }

            throw new HttpException($status, $e->getMessage());
        }

        if ($organisation) {
            $latencyMs = (int) round((microtime(true) - $started) * 1000);
            $this->lookup->recordUsage(
                endpoint: 'Postcode suggest',
                status: '200',
                outcome: 'Not billed',
                cost: '0.0000',
                latencyMs: $latencyMs,
                postcode: strtoupper(trim($query)),
                location: null,
                environment: $environment,
                organisation: $organisation,
                project: $project,
                user: $user,
            );
            $project?->increment('request_count');
        }

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }

    public function addresses(Request $request, string $postcode): JsonResponse
    {
        $started = microtime(true);
        $q = $request->query('q');
        $page = $request->query('page');
        $environment = RequestContext::environment($request);
        $organisation = RequestContext::organisation($request);
        $project = RequestContext::project($request);
        $user = $request->user();

        if ($organisation) {
            $this->limiter->assertWithinLimit($organisation);
        }

        try {
            $result = $this->lookupApi->listPostcodeAddresses(
                $postcode,
                is_numeric($page) ? (int) $page : null,
                is_string($q) ? $q : null,
            );
        } catch (RuntimeException $e) {
            $status = $e->getCode();
            if (! is_int($status) || $status < 400 || $status > 599) {
                $status = 502;
            }

            if ($organisation) {
                $this->lookup->recordUsage(
                    endpoint: 'Address lookup',
                    status: (string) $status,
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

            if ($status === 404) {
                throw new NotFoundHttpException($e->getMessage());
            }

            if ($status === 422) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            throw new HttpException($status, $e->getMessage());
        }

        $latencyMs = (int) round((microtime(true) - $started) * 1000);

        if ($organisation) {
            $normalized = $this->lookup->normalize($postcode) ?? strtoupper($postcode);
            $postcodeRecord = $this->lookup->findPostcode($postcode);
            $billable = $environment === 'Live' && $result['data'] !== [];
            $cost = $billable ? PostcodeLookupService::ADDRESS_COST : '0.0000';
            $outcome = $billable ? 'Billable' : 'Not billed';

            $this->lookup->recordUsage(
                endpoint: 'Address lookup',
                status: '200',
                outcome: $outcome,
                cost: $cost,
                latencyMs: $latencyMs,
                postcode: $normalized,
                location: $this->lookup->locationLabel($postcodeRecord),
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

        return response()->json([
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }
}
