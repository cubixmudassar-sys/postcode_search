<?php

$defaultGatewayReturnUrl = rtrim((string) env('FRONTEND_URL', env('APP_URL', 'http://localhost')), '/')
    .'/payment/lotpayment/callback';

$mode = strtolower((string) env('LOTPAYMENT_MODE', 'sandbox'));
if (! in_array($mode, ['sandbox', 'live'], true)) {
    $mode = 'sandbox';
}

$sandboxApiUrl = (string) env(
    'LOTPAYMENT_API_URL',
    'https://api.lotpayment.com/api/test/transactions/create'
);

$sandboxCheckoutUrl = (string) env(
    'LOTPAYMENT_CHECKOUT_URL',
    'https://lotpayment.com/test/checkout?basket_id={basket_id}'
);

$liveApiUrl = (string) env(
    'LOTPAYMENT_API_LIVE_URL',
    'https://api.lotpayment.com/api/transactions/create'
);

$liveCheckoutUrl = (string) env(
    'LOTPAYMENT_CHECKOUT_LIVE_URL',
    'https://lotpayment.com/checkout?basket_id={basket_id}'
);

$isLive = $mode === 'live';

return [

    'mode' => $mode,

    'client_id' => (string) env('LOTPAYMENT_CLIENT_ID', ''),

    'sandbox_api_url' => $sandboxApiUrl,

    'sandbox_checkout_url' => $sandboxCheckoutUrl,

    'live_api_url' => $liveApiUrl,

    'live_checkout_url' => $liveCheckoutUrl,

    'api_url' => $isLive ? $liveApiUrl : $sandboxApiUrl,

    'checkout_url' => $isLive ? $liveCheckoutUrl : $sandboxCheckoutUrl,

    'item' => (string) env('LOTPAYMENT_ITEM', 'Subscription plan'),

    'currency' => (string) env('LOTPAYMENT_CURRENCY', 'GBP'),

    'gateway_return_url' => (string) env('LOTPAYMENT_GATEWAY_RETURN_URL', $defaultGatewayReturnUrl),

    'result_url' => (string) env(
        'LOTPAYMENT_RESULT_URL',
        rtrim((string) env('FRONTEND_URL', 'http://localhost:8443'), '/').'/payment/result'
    ),

    'use_server_api' => (bool) env('LOTPAYMENT_USE_SERVER_API', true),

    'fallback_to_form_post_on_connection_error' => (bool) env('LOTPAYMENT_FALLBACK_FORM_POST', true),

    'http_force_ipv4' => (bool) env('LOTPAYMENT_HTTP_FORCE_IPV4', true),

    'http_retries' => max(0, (int) env('LOTPAYMENT_HTTP_RETRIES', 2)),

    'amount_as_integer' => (bool) env('LOTPAYMENT_AMOUNT_AS_INTEGER', true),

    'payment_url_keys' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'LOTPAYMENT_PAYMENT_URL_KEYS',
            'data.checkout_url,paymentUrl,redirectUrl,url,payment_url,data.payment_url,URL,redirect_url,checkout_url,checkoutUrl'
        ))
    ))),

];
