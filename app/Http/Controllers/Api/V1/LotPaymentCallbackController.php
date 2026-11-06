<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\LotPaymentCallbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LotPaymentCallbackController extends Controller
{
    public function __construct(
        private readonly LotPaymentCallbackService $callbackService,
    ) {}

    public function callback(Request $request): JsonResponse
    {
        $result = $this->callbackService->processRequest($request);
        $result['redirect_url'] = $this->callbackService->buildRedirectUrl($result);

        return response()->json($result);
    }
}
