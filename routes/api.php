<?php

use App\Http\Controllers\Api\V1\AddressController;
use App\Http\Controllers\Api\V1\Admin\AdminListController;
use App\Http\Controllers\Api\V1\Admin\ApiSettingsController;
use App\Http\Controllers\Api\V1\Admin\CustomerController;
use App\Http\Controllers\Api\V1\Admin\OperationsController;
use App\Http\Controllers\Api\V1\Admin\PricingPackageController as AdminPricingPackageController;
use App\Http\Controllers\Api\V1\ApiKeyController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\BillingPurchaseController;
use App\Http\Controllers\Api\V1\LotPaymentCallbackController;
use App\Http\Controllers\Api\V1\BulkJobController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\PostcodeController;
use App\Http\Controllers\Api\V1\PricingPackageController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\SavedListController;
use App\Http\Controllers\Api\V1\SupportTicketController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\UsageLogController;
use App\Http\Controllers\Api\V1\UsageSummaryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::get('pricing-packages', [PricingPackageController::class, 'index']);

    Route::match(['get', 'post'], 'payment/lotpayment/callback', [LotPaymentCallbackController::class, 'callback']);

    // Homepage demo lookups — no auth, no plan metering.
    Route::prefix('public')->group(function (): void {
        Route::get('postcodes/suggest', [PostcodeController::class, 'suggest']);
        Route::get('postcodes/{postcode}/addresses', [PostcodeController::class, 'addresses'])->where('postcode', '.*');
        Route::get('postcodes/{postcode}', [PostcodeController::class, 'show'])->where('postcode', '.*');
        Route::get('addresses', [AddressController::class, 'search']);
        Route::get('addresses/{id}', [AddressController::class, 'show'])->whereNumber('id');
    });

    Route::middleware('auth.api')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::patch('auth/profile', [AuthController::class, 'updateProfile']);

        // Metered user APIs — Sanctum (Lookup explorer) or API key (external).
        Route::get('postcodes/suggest', [PostcodeController::class, 'suggest']);
        Route::get('postcodes/{postcode}/addresses', [PostcodeController::class, 'addresses'])->where('postcode', '.*');
        Route::get('postcodes/{postcode}', [PostcodeController::class, 'show'])->where('postcode', '.*');
        Route::get('addresses', [AddressController::class, 'search']);
        Route::get('addresses/{id}', [AddressController::class, 'show'])->whereNumber('id');
        Route::get('usage-summary', [UsageSummaryController::class, 'show']);

        Route::get('dashboard/overview', [DashboardController::class, 'overview']);
        Route::get('projects', [ProjectController::class, 'index']);
        Route::post('projects', [ProjectController::class, 'store']);
        Route::get('api-keys', [ApiKeyController::class, 'index']);
        Route::post('api-keys', [ApiKeyController::class, 'store']);
        Route::get('usage-logs', [UsageLogController::class, 'index']);
        Route::get('billing', [BillingController::class, 'show']);
        Route::patch('billing', [BillingController::class, 'update']);
        Route::post('billing/purchase', [BillingPurchaseController::class, 'store']);
        Route::get('team', [TeamController::class, 'index']);
        Route::post('team', [TeamController::class, 'store']);
        Route::get('support-tickets', [SupportTicketController::class, 'index']);
        Route::post('support-tickets', [SupportTicketController::class, 'store']);
        Route::get('saved-lists', [SavedListController::class, 'index']);
        Route::post('saved-lists/items', [SavedListController::class, 'storeItem']);
        Route::post('bulk-jobs', [BulkJobController::class, 'store']);
        Route::patch('bulk-jobs/{bulkJob}', [BulkJobController::class, 'update']);
    });

    Route::middleware(['auth.api', 'staff'])->prefix('admin')->group(function (): void {
        Route::get('operations/overview', [OperationsController::class, 'overview']);
        Route::get('operations/providers', [OperationsController::class, 'providers']);
        Route::get('operations/audits', [OperationsController::class, 'audits']);
        Route::get('customers', [CustomerController::class, 'index'])->name('admin.customers.index');
        Route::get('customers/{organisation}', [CustomerController::class, 'show'])->name('admin.customers.show');
        Route::patch('customers/{organisation}', [CustomerController::class, 'update'])->name('admin.customers.update');
        Route::patch('customers/{organisation}/status', [CustomerController::class, 'updateStatus'])->name('admin.customers.status');
        Route::get('customers/{organisation}/users', [CustomerController::class, 'users'])->name('admin.customers.users');
        Route::patch('customers/{organisation}/users/{user}', [CustomerController::class, 'updateUser'])->name('admin.customers.users.update');

        Route::get('pricing-packages', [AdminPricingPackageController::class, 'index']);
        Route::post('pricing-packages', [AdminPricingPackageController::class, 'store']);
        Route::patch('pricing-packages/{pricingPackage}', [AdminPricingPackageController::class, 'update']);
        Route::delete('pricing-packages/{pricingPackage}', [AdminPricingPackageController::class, 'destroy']);

        Route::get('api-operations', [AdminListController::class, 'apiOperations']);
        Route::get('providers-datasets', [AdminListController::class, 'providersDatasets']);
        Route::get('billing-records', [AdminListController::class, 'billing']);
        Route::get('abuse-controls', [AdminListController::class, 'abuseControls']);
        Route::get('support-queues', [AdminListController::class, 'support']);
        Route::get('content', [AdminListController::class, 'content']);
        Route::get('audit-log', [AdminListController::class, 'auditLog']);
        Route::get('staff-settings', [AdminListController::class, 'staffSettings']);
        Route::get('api-settings', [ApiSettingsController::class, 'show']);
        Route::patch('api-settings', [ApiSettingsController::class, 'update']);
        Route::get('bulk-jobs', [AdminListController::class, 'bulkJobs']);
    });
});
