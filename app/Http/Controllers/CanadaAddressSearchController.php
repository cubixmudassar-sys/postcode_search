<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\View\View;

class CanadaAddressSearchController extends Controller
{
    public function index(): View
    {
        return view('search-address');
    }

    public function find(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['required', 'string', 'max:255'],
            'last_id' => ['nullable', 'string', 'max:255'],
        ]);

        $key = $this->apiKey();
        if ($key === null) {
            return response()->json([
                'message' => 'Canada Post AddressComplete API key is not configured.',
            ], 503);
        }

        $findUrl = (string) config('services.canadapost.find_url');
        $referer = $this->canadaPostReferer($request);

        // #region agent log
        $this->agentDebugLog('A', 'CanadaAddressSearchController.php:find:entry', 'Find v2.10 invoked', [
            'api' => 'find_v2_10',
            'findUrl' => $findUrl,
            'searchTerm' => $validated['search'],
            'lastId' => $validated['last_id'] ?? '',
            'browserReferer' => $request->headers->get('referer'),
            'outboundReferer' => $referer,
            'appUrl' => config('app.url'),
            'appEnv' => config('app.env'),
        ]);
        // #endregion

        $response = $this->canadaPostClient($request)
            ->post($findUrl, [
                'Key' => $key,
                'SearchTerm' => $validated['search'],
                'LastId' => $validated['last_id'] ?? '',
                'SearchFor' => 'Everything',
                'Country' => 'CAN',
                'LanguagePreference' => 'EN',
                'MaxSuggestions' => 7,
                'MaxResults' => 7,
                'Origin' => 'CAN',
                'Bias' => '',
                'Filters' => '',
                'GeoFence' => '',
            ]);

        if (! $response->successful()) {
            // #region agent log
            $this->agentDebugLog('C', 'CanadaAddressSearchController.php:find:http-fail', 'Find HTTP failure', [
                'status' => $response->status(),
                'bodySnippet' => substr($response->body(), 0, 300),
            ]);
            // #endregion

            return response()->json([
                'message' => 'Unable to reach Canada Post AddressComplete Find service.',
            ], 502);
        }

        $items = $response->json('Items') ?? [];

        if ($error = $this->canadaPostError($items)) {
            // #region agent log
            $this->agentDebugLog('B', 'CanadaAddressSearchController.php:find:api-error', 'Find returned Canada Post error', [
                'errorCode' => is_array($items[0] ?? null) ? ($items[0]['Error'] ?? null) : null,
                'errorDescription' => $error,
                'outboundReferer' => $referer,
                'findUrl' => $findUrl,
                'itemCount' => count($items),
            ]);
            // #endregion

            return response()->json(['message' => $error], 422);
        }

        // #region agent log
        $this->agentDebugLog('A', 'CanadaAddressSearchController.php:find:success', 'Find succeeded; Retrieve not called yet', [
            'itemCount' => count($items),
            'firstText' => is_array($items[0] ?? null) ? ($items[0]['Text'] ?? null) : null,
            'firstDescription' => is_array($items[0] ?? null) ? ($items[0]['Description'] ?? null) : null,
            'firstNext' => is_array($items[0] ?? null) ? ($items[0]['Next'] ?? null) : null,
            'retrieveCalled' => false,
        ]);
        // #endregion

        return response()->json(['Items' => $items]);
    }

    public function retrieve(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => ['required', 'string', 'max:255'],
        ]);

        $key = $this->apiKey();
        if ($key === null) {
            return response()->json([
                'message' => 'Canada Post AddressComplete API key is not configured.',
            ], 503);
        }

        $retrieveUrl = (string) config('services.canadapost.retrieve_url');
        $referer = $this->canadaPostReferer($request);

        // #region agent log
        $this->agentDebugLog('E', 'CanadaAddressSearchController.php:retrieve:entry', 'Retrieve v2.11 invoked', [
            'api' => 'retrieve_v2_11',
            'retrieveUrl' => $retrieveUrl,
            'idPresent' => $validated['id'] !== '',
            'outboundReferer' => $referer,
        ]);
        // #endregion

        $response = $this->canadaPostClient($request)
            ->post($retrieveUrl, [
                'Key' => $key,
                'Id' => $validated['id'],
            ]);

        if (! $response->successful()) {
            // #region agent log
            $this->agentDebugLog('C', 'CanadaAddressSearchController.php:retrieve:http-fail', 'Retrieve HTTP failure', [
                'status' => $response->status(),
            ]);
            // #endregion

            return response()->json([
                'message' => 'Unable to reach Canada Post AddressComplete Retrieve service.',
            ], 502);
        }

        $items = $response->json('Items') ?? [];

        if ($error = $this->canadaPostError($items)) {
            // #region agent log
            $this->agentDebugLog('B', 'CanadaAddressSearchController.php:retrieve:api-error', 'Retrieve returned Canada Post error', [
                'errorCode' => is_array($items[0] ?? null) ? ($items[0]['Error'] ?? null) : null,
                'errorDescription' => $error,
                'outboundReferer' => $referer,
            ]);
            // #endregion

            return response()->json(['message' => $error], 422);
        }

        if ($items === []) {
            return response()->json([
                'message' => 'Sorry, there were no results.',
            ], 404);
        }

        // #region agent log
        $this->agentDebugLog('E', 'CanadaAddressSearchController.php:retrieve:success', 'Retrieve succeeded', [
            'hasLabel' => isset($items[0]['Label']),
            'postalCode' => $items[0]['PostalCode'] ?? null,
        ]);
        // #endregion

        return response()->json(['Item' => $items[0], 'Items' => $items]);
    }

    private function canadaPostClient(Request $request): PendingRequest
    {
        return Http::asForm()
            ->timeout((int) config('services.canadapost.timeout', 15))
            ->withHeaders([
                'Referer' => $this->canadaPostReferer($request),
            ]);
    }

    private function canadaPostReferer(Request $request): string
    {
        $configured = config('services.canadapost.referer');

        if (is_string($configured) && trim($configured) !== '') {
            return trim($configured);
        }

        return $request->headers->get('referer')
            ?: rtrim((string) config('app.url'), '/').'/search_address';
    }

    // #region agent log
    /**
     * @param  array<string, mixed>  $data
     */
    private function agentDebugLog(string $hypothesisId, string $location, string $message, array $data): void
    {
        $payload = [
            'sessionId' => 'eaa75e',
            'runId' => 'post-fix',
            'hypothesisId' => $hypothesisId,
            'location' => $location,
            'message' => $message,
            'data' => $data,
            'timestamp' => (int) round(microtime(true) * 1000),
        ];

        file_put_contents(
            base_path('.cursor/debug-eaa75e.log'),
            json_encode($payload, JSON_UNESCAPED_SLASHES)."\n",
            FILE_APPEND
        );
    }
    // #endregion

    private function apiKey(): ?string
    {
        $key = config('services.canadapost.key');

        if (! is_string($key) || trim($key) === '') {
            return null;
        }

        return $key;
    }

    /**
     * @param  array<int, mixed>  $items
     */
    private function canadaPostError(array $items): ?string
    {
        if (count($items) === 1 && is_array($items[0]) && isset($items[0]['Error'])) {
            return (string) ($items[0]['Description'] ?? 'AddressComplete returned an error.');
        }

        return null;
    }
}
