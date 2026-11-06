<?php

namespace App\Http\Controllers;

use App\Services\LotPaymentCallbackService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LotPaymentWebCallbackController extends Controller
{
    public function __construct(
        private readonly LotPaymentCallbackService $callbackService,
    ) {}

    public function __invoke(Request $request): RedirectResponse
    {
        $result = $this->callbackService->processRequest($request);

        return redirect()->away($this->callbackService->buildRedirectUrl($result));
    }
}
