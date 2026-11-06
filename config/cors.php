<?php

$normalizeCsv = static function (?string $value, string $default): array {
    $raw = $value !== null && trim($value) !== '' ? $value : $default;

    return array_values(array_filter(
        array_map(trim(...), explode(',', $raw)),
        static fn (string $item): bool => $item !== ''
    ));
};

$origins = $normalizeCsv(env('CORS_ALLOWED_ORIGINS'), '*');

$frontendUrl = rtrim((string) env('FRONTEND_URL', ''), '/');
if ($frontendUrl !== '' && (str_starts_with($frontendUrl, 'http://') || str_starts_with($frontendUrl, 'https://'))) {
    $origins[] = $frontendUrl;
}

$hasWildcardOrigin = in_array('*', $origins, true);

if (! $hasWildcardOrigin) {
    $knownFrontends = [
        'https://trustscoring.com',
        'https://www.trustscoring.com',
        'https://lookuppostcode.com',
        'https://www.lookuppostcode.com',
    ];
    $origins = array_values(array_unique(array_merge($origins, $knownFrontends)));
}

/** @var list<string> $origins */
$origins = array_values(array_unique($origins));

$patternsRaw = env('CORS_ALLOWED_ORIGIN_PATTERNS');
$patterns = $patternsRaw !== null && trim((string) $patternsRaw) !== ''
    ? $normalizeCsv($patternsRaw, '')
    : [];

if ($patterns === []) {
    $patterns = [
        '#^https://([\w-]+\.)*trustscoring\.com$#i',
        '#^https://([\w-]+\.)*lookuppostcode\.com$#i',
        '#^https://([\w-]+\.)*lotpayment\.com$#i',
        '#^https://([\w-]+\.)*cryptopaylio\.com$#i',
    ];
}

return [

    /*
     * Include trustscoring-api/* — that proxy lives on web routes, not api/*,
     * and the homepage widget loads it cross-origin from the SPA host.
     */
    'paths' => [
        'api/*',
        'trustscoring-api/*',
        'sanctum/csrf-cookie',
        'uploads/*',
        'storage/*',
    ],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => $patterns,

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => (int) env('CORS_MAX_AGE', 86400),

    'supports_credentials' => filter_var(
        env('CORS_SUPPORTS_CREDENTIALS', false),
        FILTER_VALIDATE_BOOL
    ),

];
