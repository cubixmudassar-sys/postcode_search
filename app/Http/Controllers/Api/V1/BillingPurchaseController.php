<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OrganisationBillingTransaction;
use App\Models\PricingPackage;
use App\Services\LotPaymentService;
use App\Support\RequestContext;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class BillingPurchaseController extends Controller
{
    public function __construct(
        private readonly LotPaymentService $lotPaymentService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $organisation = RequestContext::organisation($request);

        if (! $organisation) {
            return response()->json(['message' => 'Organisation context required.'], 422);
        }

        $validated = $request->validate([
            'package_id' => ['required', 'integer', 'exists:pricing_packages,id'],
        ]);

        $package = PricingPackage::query()
            ->whereKey($validated['package_id'])
            ->where('is_active', true)
            ->firstOrFail();

        if ($package->amount === null) {
            return response()->json([
                'message' => 'This plan requires contacting sales.',
            ], 422);
        }

        if ((float) $package->amount <= 0) {
            return response()->json([
                'message' => 'This plan does not require payment. Save it from billing settings.',
            ], 422);
        }

        $msisdn = LotPaymentService::sanitizeMsisdn($organisation->billing_phone);

        if ($msisdn === null) {
            return response()->json([
                'message' => 'Please add a valid billing phone number before purchasing a plan.',
            ], 422);
        }

        /** @var \App\Models\User $user */
        $user = $request->user();
        $payeeName = $organisation->billing_name ?: $organisation->name ?: $user->name;
        $email = $user->email;

        if (! is_string($email) || $email === '') {
            return response()->json([
                'message' => 'A valid account email is required to purchase a plan.',
            ], 422);
        }

        $transactionId = 'TXN-'.Str::upper(Str::ulid()->toBase32());
        $amount = LotPaymentService::formatAmount((float) $package->amount);
        $currency = $package->currency ?: config('lotpayment.currency', 'GBP');
        $description = 'Order payment - '.$package->name;

        $transaction = OrganisationBillingTransaction::query()->create([
            'organisation_id' => $organisation->id,
            'pricing_package_id' => $package->id,
            'customer_transaction_id' => $transactionId,
            'amount' => $package->amount,
            'currency' => $currency,
            'payee_name' => $payeeName,
            'email' => $email,
            'msisdn' => $msisdn,
            'description' => $description,
            'status' => OrganisationBillingTransaction::STATUS_PENDING,
        ]);

        $paymentFields = LotPaymentService::buildPaymentFields(
            $package,
            $transactionId,
            $payeeName,
            $email,
            $msisdn,
        );

        if (config('lotpayment.use_server_api')) {
            return $this->initiateServerPayment($transaction, $paymentFields, $transactionId, $amount, $currency);
        }

        return $this->formPostResponse($paymentFields, $transactionId, $amount, $currency);
    }

    /**
     * @param  array<string, mixed>  $paymentFields
     */
    private function formPostResponse(
        array $paymentFields,
        string $transactionId,
        int|float $amount,
        string $currency,
    ): JsonResponse {
        return response()->json([
            'data' => [
                'redirect_method' => 'form_post',
                'payment_action_url' => config('lotpayment.api_url'),
                'payment_checkout_url' => config('lotpayment.checkout_url'),
                'payment_fields' => $paymentFields,
                'transaction_id' => $transactionId,
                'amount' => $amount,
                'currency' => $currency,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $paymentFields
     */
    private function initiateServerPayment(
        OrganisationBillingTransaction $transaction,
        array $paymentFields,
        string $transactionId,
        int|float $amount,
        string $currency,
    ): JsonResponse {
        try {
            $gateway = $this->lotPaymentService->createTransaction($paymentFields);
        } catch (RuntimeException|RequestException $exception) {
            if (
                config('lotpayment.fallback_to_form_post_on_connection_error')
                && $exception instanceof RuntimeException
                && $this->lotPaymentService->isConnectionError($exception)
            ) {
                Log::warning('LotPayment server API unavailable, falling back to browser payment', [
                    'transaction_id' => $transactionId,
                    'error' => $exception->getMessage(),
                ]);

                return $this->formPostResponse($paymentFields, $transactionId, $amount, $currency);
            }

            Log::warning('LotPayment server payment initiation failed', [
                'transaction_id' => $transactionId,
                'error' => $exception->getMessage(),
            ]);

            $transaction->update([
                'status' => OrganisationBillingTransaction::STATUS_FAILED,
                'gateway_response' => ['error' => $exception->getMessage()],
            ]);

            $response = [
                'message' => 'Could not initiate payment. Please try again.',
            ];

            if (config('app.debug')) {
                $response['debug'] = $exception->getMessage();
            }

            return response()->json($response, 502);
        }

        $transaction->update([
            'gateway_response' => array_merge(
                $gateway['gateway_response'],
                [
                    'billReferenceNo' => $paymentFields['billReferenceNo'] ?? null,
                ],
            ),
        ]);

        $basketId = LotPaymentService::extractBasketId($gateway['gateway_response']);

        if ($basketId !== null) {
            $transaction->update(['basket_id' => $basketId]);
        }

        return response()->json([
            'data' => [
                'redirect_method' => 'redirect',
                'payment_url' => $gateway['payment_url'],
                'transaction_id' => $transactionId,
                'amount' => $amount,
                'currency' => $currency,
            ],
        ], 201);
    }
}
