<?php

namespace App\Services;

use App\Models\OrganisationBillingTransaction;
use Carbon\Carbon;
use Illuminate\Http\Request;

class LotPaymentCallbackService
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function process(array $payload): array
    {
        $transactionId = $this->resolveTransactionId($payload);
        $basketId = $this->resolveBasketId($payload);

        $transaction = $this->findTransaction($transactionId, $basketId);

        if ($transaction === null) {
            return $this->buildFailureResponse(
                payload: $payload,
                transaction: null,
                transactionId: $transactionId,
                basketId: $basketId,
                failureMessage: $this->humanizePaymentFailureMessage(
                    $this->resolveFailureMessage($payload) ?? ''
                ),
            );
        }

        if ($transaction->status !== OrganisationBillingTransaction::STATUS_PENDING) {
            return $this->buildAlreadyProcessedResponse($transaction);
        }

        if ($this->resolvePaymentSuccess($payload)) {
            $this->completeTransaction($transaction, $payload, $basketId);

            return $this->buildSuccessResponse($transaction, $payload);
        }

        $this->failTransaction($transaction, $payload, $basketId);

        $failureMessage = $this->resolveFailureMessage($payload);

        return $this->buildFailureResponse(
            payload: $payload,
            transaction: $transaction->fresh(['package']),
            transactionId: $transaction->customer_transaction_id,
            basketId: $basketId ?? $transaction->basket_id,
            failureMessage: $failureMessage !== null
                ? $this->humanizePaymentFailureMessage($failureMessage)
                : 'Payment could not be completed. Please try again.',
        );
    }

    /**
     * @param  array<string, mixed>  $result
     */
    public function buildRedirectUrl(array $result): string
    {
        $status = ($result['status'] ?? '') === 'success' ? 'success' : 'failure';

        $message = is_string($result['message'] ?? null) ? $result['message'] : null;

        if ($status === 'failure' && ($message === null || $message === '')) {
            $message = $this->humanizePaymentFailureMessage(
                (string) ($result['err_msg'] ?? $result['details'] ?? '')
            );
        }

        $extraParams = $this->buildRedirectPassthroughParams($result, $status);

        return LotPaymentService::buildResultRedirectUrl(
            $status,
            is_string($result['customer_transaction_id'] ?? null) ? $result['customer_transaction_id'] : null,
            is_string($result['plan_name'] ?? null) ? $result['plan_name'] : (
                is_string($result['item'] ?? null) ? $result['item'] : null
            ),
            $message,
            $extraParams,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function processRequest(Request $request): array
    {
        $payload = array_merge(
            $request->query(),
            $request->post(),
            $request->json()?->all() ?? [],
        );

        return $this->process($payload);
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array<string, string>
     */
    private function buildRedirectPassthroughParams(array $result, string $status): array
    {
        $params = [];

        foreach (['basket_id', 'amount', 'currency', 'item', 'description', 'email', 'created_at', 'processed_at'] as $key) {
            $value = $result[$key] ?? null;

            if (is_string($value) && $value !== '') {
                $params[$key] = $value;
            }
        }

        if ($status === 'failure') {
            foreach (['payment_status', 'err_code', 'err_msg', 'details'] as $key) {
                $value = $result[$key] ?? null;

                if (is_string($value) && $value !== '') {
                    $params[$key] = $value;
                }
            }
        }

        if (($result['already_processed'] ?? false) === true) {
            $params['already_processed'] = '1';
        }

        return $params;
    }

    private function findTransaction(?string $transactionId, ?string $basketId): ?OrganisationBillingTransaction
    {
        if ($transactionId !== null) {
            $transaction = OrganisationBillingTransaction::query()
                ->with(['package', 'organisation'])
                ->where('customer_transaction_id', $transactionId)
                ->first();

            if ($transaction !== null) {
                return $transaction;
            }
        }

        if ($basketId === null) {
            return null;
        }

        return OrganisationBillingTransaction::query()
            ->with(['package', 'organisation'])
            ->where('basket_id', $basketId)
            ->latest()
            ->first();
    }

    private function buildAlreadyProcessedResponse(OrganisationBillingTransaction $transaction): array
    {
        $transaction->loadMissing(['package', 'organisation']);

        $isSuccess = $transaction->status === OrganisationBillingTransaction::STATUS_COMPLETED;
        $message = 'This payment response has already been recorded.';

        $base = [
            'already_processed' => true,
            'customer_transaction_id' => $transaction->customer_transaction_id,
            'basket_id' => $transaction->basket_id,
            'amount' => $this->formatAmount($transaction->amount),
            'currency' => $this->stringValue($transaction->currency),
            'item' => $this->stringValue($transaction->package?->name),
            'description' => $this->stringValue($transaction->description),
            'email' => $this->stringValue($transaction->email),
            'created_at' => $this->formatTimestamp($transaction->created_at),
            'processed_at' => $this->formatTimestamp($transaction->paid_at ?? $transaction->updated_at),
            'plan_name' => $transaction->package?->name,
            'organisation_name' => $transaction->organisation?->name,
            'message' => $message,
        ];

        if ($isSuccess) {
            return array_merge($base, [
                'status' => 'success',
            ]);
        }

        $gatewayCallback = is_array($transaction->gateway_response['callback'] ?? null)
            ? $transaction->gateway_response['callback']
            : [];

        return array_merge($base, [
            'status' => 'failure',
            'payment_status' => $this->stringValue($gatewayCallback['payment_status'] ?? null) ?? 'error',
            'err_code' => $transaction->gateway_response['err_code'] ?? $this->resolveErrorCode($gatewayCallback),
            'err_msg' => $this->stringValue($gatewayCallback['err_msg'] ?? null) ?? $message,
            'details' => $this->stringValue($gatewayCallback['details'] ?? null) ?? $message,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function completeTransaction(
        OrganisationBillingTransaction $transaction,
        array $payload,
        ?string $basketId,
    ): void {
        if ($transaction->status === OrganisationBillingTransaction::STATUS_COMPLETED) {
            return;
        }

        $processedAt = $this->resolveProcessedAt($payload) ?? now();

        $transaction->update($this->buildTransactionUpdate($transaction, $payload, $basketId, [
            'status' => OrganisationBillingTransaction::STATUS_COMPLETED,
            'paid_at' => $processedAt,
        ]));

        $package = $transaction->package;
        $organisation = $transaction->organisation;

        if ($package !== null && $organisation !== null) {
            $organisation->update([
                'plan' => $package->slug,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function failTransaction(
        OrganisationBillingTransaction $transaction,
        array $payload,
        ?string $basketId,
    ): void {
        if ($transaction->status !== OrganisationBillingTransaction::STATUS_PENDING) {
            return;
        }

        $transaction->update($this->buildTransactionUpdate($transaction, $payload, $basketId, [
            'status' => OrganisationBillingTransaction::STATUS_FAILED,
        ]));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function buildTransactionUpdate(
        OrganisationBillingTransaction $transaction,
        array $payload,
        ?string $basketId,
        array $overrides,
    ): array {
        $gatewayResponse = array_merge(
            $transaction->gateway_response ?? [],
            [
                'callback' => $payload,
            ],
        );

        $errCode = $this->resolveErrorCode($payload);

        if ($errCode !== null) {
            $gatewayResponse['err_code'] = $errCode;
        }

        $update = array_merge($overrides, [
            'gateway_response' => $gatewayResponse,
        ]);

        $resolvedBasketId = $basketId ?? $this->resolveBasketId($payload);

        if ($resolvedBasketId !== null) {
            $update['basket_id'] = $resolvedBasketId;
        }

        return $update;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function buildSuccessResponse(OrganisationBillingTransaction $transaction, array $payload): array
    {
        $transaction->refresh();
        $transaction->loadMissing(['package', 'organisation']);

        return [
            'status' => 'success',
            'customer_transaction_id' => $transaction->customer_transaction_id,
            'basket_id' => $this->resolveBasketId($payload) ?? $transaction->basket_id,
            'amount' => $this->formatAmount($payload['amount'] ?? $transaction->amount),
            'currency' => $this->stringValue($payload['currency'] ?? $transaction->currency),
            'item' => $this->stringValue($payload['item'] ?? $transaction->package?->name),
            'description' => $this->stringValue($payload['description'] ?? $transaction->description),
            'email' => $this->stringValue($payload['email'] ?? $transaction->email),
            'created_at' => $this->formatTimestamp($transaction->created_at),
            'processed_at' => $this->formatTimestamp(
                $this->resolveProcessedAt($payload) ?? $transaction->paid_at ?? now()
            ),
            'plan_name' => $transaction->package?->name,
            'organisation_name' => $transaction->organisation?->name,
            'message' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function buildFailureResponse(
        array $payload,
        ?OrganisationBillingTransaction $transaction,
        ?string $transactionId,
        ?string $basketId,
        string $failureMessage,
    ): array {
        $errCode = $this->resolveErrorCode($payload);
        $errMsg = $this->stringValue($payload['err_msg'] ?? null) ?? $failureMessage;
        $details = $this->stringValue($payload['details'] ?? null) ?? $errMsg;

        return [
            'status' => 'failure',
            'customer_transaction_id' => $transactionId ?? $transaction?->customer_transaction_id,
            'basket_id' => $basketId ?? $transaction?->basket_id ?? $this->resolveBasketId($payload),
            'amount' => $this->formatAmount($payload['amount'] ?? $transaction?->amount),
            'currency' => $this->stringValue($payload['currency'] ?? $transaction?->currency),
            'item' => $this->stringValue($payload['item'] ?? $transaction?->package?->name),
            'description' => $this->stringValue($payload['description'] ?? $transaction?->description),
            'email' => $this->stringValue($payload['email'] ?? $transaction?->email),
            'created_at' => $this->formatTimestamp($transaction?->created_at),
            'processed_at' => $this->formatTimestamp($this->resolveProcessedAt($payload) ?? now()),
            'payment_status' => $this->stringValue($payload['payment_status'] ?? null) ?? 'error',
            'err_code' => $errCode,
            'err_msg' => $errMsg,
            'details' => $details,
            'plan_name' => $transaction?->package?->name,
            'organisation_name' => $transaction?->organisation?->name,
            'message' => $failureMessage,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveTransactionId(array $payload): ?string
    {
        foreach ([
            'customer_transaction_id',
            'customerTransactionid',
            'customerTransactionId',
            'customer_trans_id',
            'customerTransId',
            'transaction_id',
            'transactionId',
        ] as $key) {
            $value = $payload[$key] ?? null;

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveBasketId(array $payload): ?string
    {
        foreach (['basket_id', 'basketId'] as $key) {
            $value = $payload[$key] ?? null;

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolvePaymentSuccess(array $payload): bool
    {
        $successValues = ['success', 'successful', 'completed', 'paid', 'approved', 'true', '1', 'ok'];
        $failureValues = ['failed', 'failure', 'cancelled', 'canceled', 'declined', 'false', '0', 'error'];

        foreach (['status', 'payment_status', 'result', 'success', 'paymentStatus', 'paymentResult'] as $key) {
            $value = $payload[$key] ?? null;

            if (! is_string($value) || $value === '') {
                continue;
            }

            $normalized = strtolower(trim($value));

            if (in_array($normalized, $successValues, true)) {
                return true;
            }

            if (in_array($normalized, $failureValues, true)) {
                return false;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveFailureMessage(array $payload): ?string
    {
        foreach (['err_msg', 'details', 'message', 'error'] as $key) {
            $value = $payload[$key] ?? null;

            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveErrorCode(array $payload): ?string
    {
        foreach (['err_code', 'error_code', 'code'] as $key) {
            $value = $payload[$key] ?? null;

            if (is_string($value) && $value !== '') {
                return $value;
            }

            if (is_int($value) || is_float($value)) {
                return (string) $value;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveProcessedAt(array $payload): ?Carbon
    {
        foreach (['processed_at', 'paid_at', 'completed_at'] as $key) {
            $value = $payload[$key] ?? null;

            if (! is_string($value) || trim($value) === '') {
                continue;
            }

            try {
                return Carbon::parse($value);
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    private function humanizePaymentFailureMessage(string $message): string
    {
        $trimmed = trim($message);

        return $trimmed !== '' ? $trimmed : 'Payment could not be completed. Please try again.';
    }

    private function formatAmount(mixed $amount): ?string
    {
        if ($amount === null || $amount === '') {
            return null;
        }

        return number_format((float) $amount, 2, '.', '');
    }

    private function stringValue(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function formatTimestamp(mixed $value): ?string
    {
        if ($value instanceof Carbon) {
            return $value->toIso8601String();
        }

        if (is_string($value) && $value !== '') {
            return $value;
        }

        return null;
    }
}
