<?php

namespace App\Services;

use App\Models\PricingPackage;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class LotPaymentService
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array{payment_url: string, gateway_response: array<string, mixed>}
     */
    public function createTransaction(array $payload): array
    {
        try {
            $response = $this->httpClient()->post(config('lotpayment.api_url'), $payload);
        } catch (ConnectionException|\InvalidArgumentException $exception) {
            Log::warning('LotPayment connection failed', [
                'url' => config('lotpayment.api_url'),
                'error' => $exception->getMessage(),
            ]);

            throw new RuntimeException(
                'LotPayment connection failed: '.$exception->getMessage(),
                previous: $exception
            );
        }

        return $this->parseCreateTransactionResponse($response);
    }

    public function isConnectionError(RuntimeException $exception): bool
    {
        $previous = $exception->getPrevious();

        if ($previous instanceof ConnectionException) {
            return true;
        }

        $message = strtolower($exception->getMessage());

        return str_contains($message, 'curl error')
            || str_contains($message, 'connection failed')
            || str_contains($message, 'connection was reset')
            || str_contains($message, 'ssl')
            || str_contains($message, 'timed out');
    }

    /**
     * @return array{payment_url: string, gateway_response: array<string, mixed>}
     */
    private function parseCreateTransactionResponse(Response $response): array
    {
        $body = $response->json() ?? [];
        $bodyString = is_array($body) ? json_encode($body) : (string) $response->body();

        Log::info('LotPayment create transaction response', [
            'status' => $response->status(),
            'body' => $bodyString,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException(
                'LotPayment payment initiation failed: '.$response->body()
            );
        }

        /** @var array<string, mixed> $body */
        $body = is_array($body) ? $body : [];

        if (! $this->isSuccessfulResponse($body)) {
            $message = is_string($body['message'] ?? null)
                ? $body['message']
                : $bodyString;

            throw new RuntimeException(
                'LotPayment payment initiation failed: '.$message
            );
        }

        $paymentUrl = $this->extractPaymentUrl($body);

        if ($paymentUrl === null || $paymentUrl === '') {
            throw new RuntimeException(
                'LotPayment response did not include a payment redirect URL.'
            );
        }

        return [
            'payment_url' => $paymentUrl,
            'gateway_response' => $body,
        ];
    }

    private function httpClient(): PendingRequest
    {
        $options = [
            'http_version' => '1.1',
            'connect_timeout' => 15,
            'timeout' => 30,
        ];

        if (config('lotpayment.http_force_ipv4')) {
            $options['force_ip_resolve'] = 'v4';
        }

        $client = Http::acceptJson()
            ->asJson()
            ->withOptions($options);

        $retries = (int) config('lotpayment.http_retries', 2);

        if ($retries > 0) {
            $client = $client->retry($retries, 500, function ($exception): bool {
                return $exception instanceof ConnectionException;
            }, throw: false);
        }

        return $client;
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public function extractPaymentUrl(array $body): ?string
    {
        foreach (['basket_id', 'basketId', 'data.basket_id', 'data.basketId'] as $basketKey) {
            $basketId = Arr::get($body, $basketKey);

            if (is_string($basketId) && $basketId !== '') {
                return self::buildCheckoutUrl($basketId);
            }
        }

        $configuredKeys = config('lotpayment.payment_url_keys', []);

        foreach ($configuredKeys as $key) {
            $value = Arr::get($body, $key);

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        foreach (['data.paymentUrl', 'data.redirectUrl', 'data.url', 'data.payment_url', 'data.checkout_url', 'data.checkoutUrl', 'result.paymentUrl'] as $nestedKey) {
            $value = Arr::get($body, $nestedKey);

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    public static function buildCheckoutUrl(string $basketId): string
    {
        $checkoutUrl = trim((string) config('lotpayment.checkout_url'));

        if ($checkoutUrl === '' || ! str_contains($checkoutUrl, '{basket_id}')) {
            throw new RuntimeException(
                'LOTPAYMENT_CHECKOUT_URL is not configured. Set it to e.g. https://lotpayment.com/checkout?basket_id={basket_id}'
            );
        }

        return str_replace('{basket_id}', rawurlencode($basketId), $checkoutUrl);
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function isSuccessfulResponse(array $body): bool
    {
        if (($body['success'] ?? false) === true) {
            return true;
        }

        return strtolower((string) ($body['status'] ?? '')) === 'success';
    }

    public static function sanitizeMsisdn(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '92') && strlen($digits) >= 12) {
            return '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '44') && strlen($digits) >= 11) {
            return '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            return $digits;
        }

        return strlen($digits) >= 10 ? '0'.$digits : null;
    }

    public static function formatAmount(float $price): int|float
    {
        if (config('lotpayment.amount_as_integer')) {
            return (int) round($price);
        }

        return (float) $price;
    }

    public static function buildBillReferenceNo(PricingPackage $package): string
    {
        return $package->id.'-'.$package->name;
    }

    /**
     * @return array<string, mixed>
     */
    public static function buildPaymentFields(
        PricingPackage $package,
        string $transactionId,
        string $payeeName,
        string $email,
        string $msisdn,
    ): array {
        $amount = self::formatAmount((float) $package->amount);
        $description = 'Order payment - '.$package->name;

        return [
            'clientid' => config('lotpayment.client_id'),
            'customer_transaction_id' => $transactionId,
            'billReferenceNo' => self::buildBillReferenceNo($package),
            'item' => $package->name,
            'returnUrl' => self::returnUrl(),
            'amount' => $amount,
            'PayeeName' => $payeeName,
            'Email' => $email,
            'MSISDN' => $msisdn,
            'description' => $description,
            'currency' => $package->currency ?: config('lotpayment.currency', 'GBP'),
        ];
    }

    public static function returnUrl(): string
    {
        $url = trim((string) config('lotpayment.gateway_return_url'));

        if ($url !== '') {
            return $url;
        }

        return rtrim((string) env('FRONTEND_URL', config('app.url')), '/')
            .'/payment/lotpayment/callback';
    }

    public static function resultUrl(): string
    {
        return trim((string) config('lotpayment.result_url'));
    }

    /**
     * @param  array<string, mixed>  $body
     */
    public static function extractBasketId(array $body): ?string
    {
        foreach (['basket_id', 'basketId', 'data.basket_id', 'data.basketId'] as $basketKey) {
            $basketId = Arr::get($body, $basketKey);

            if (is_string($basketId) && $basketId !== '') {
                return $basketId;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $extraParams
     */
    public static function buildResultRedirectUrl(
        string $status,
        ?string $transactionId = null,
        ?string $planName = null,
        ?string $message = null,
        array $extraParams = [],
    ): string {
        $normalizedStatus = strtolower($status) === 'success' ? 'success' : 'failure';
        $base = self::resultUrl();
        $parsed = parse_url($base) ?: [];
        $query = array_merge($extraParams, [
            'status' => $normalizedStatus,
        ]);

        if ($transactionId !== null && $transactionId !== '') {
            $query['transaction_id'] = $transactionId;
            $query['customer_transaction_id'] = $transactionId;
        }

        if ($normalizedStatus === 'success' && $planName !== null && $planName !== '') {
            $query['plan_name'] = $planName;
        }

        if ($message !== null && $message !== '') {
            $query['message'] = mb_substr($message, 0, 500);
        }

        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'] ?? 'localhost';
        $port = isset($parsed['port']) ? ':'.$parsed['port'] : '';
        $path = $parsed['path'] ?? '/payment/result';

        return $scheme.'://'.$host.$port.$path.'?'.http_build_query($query);
    }
}
