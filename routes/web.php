<?php

use App\Http\Controllers\CanadaAddressSearchController;
use App\Http\Controllers\LotPaymentWebCallbackController;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/search_address', [CanadaAddressSearchController::class, 'index'])
    ->name('search_address');
Route::post('/search_address/find', [CanadaAddressSearchController::class, 'find'])
    ->name('search_address.find');
Route::post('/search_address/retrieve', [CanadaAddressSearchController::class, 'retrieve'])
    ->name('search_address.retrieve');

Route::match(['get', 'post'], '/payment/lotpayment/callback', LotPaymentWebCallbackController::class)
    ->name('payment.lotpayment.callback');

Route::get('/trustscoring-api/{path}', function (string $path) {
    $query = request()->getQueryString();
    $url = 'https://api.trustscoring.com/api/'.ltrim($path, '/');
    if ($query) {
        $url .= '?'.$query;
    }

    $upstream = Http::timeout(15)->acceptJson()->get($url);

    return response($upstream->body(), $upstream->status())
        ->header('Content-Type', $upstream->header('Content-Type') ?: 'application/json');
})->where('path', '.*');