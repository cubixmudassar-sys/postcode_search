<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organisations', function (Blueprint $table) {
            if (! Schema::hasColumn('organisations', 'billing_phone')) {
                $table->string('billing_phone', 32)->nullable()->after('billing_name');
            }
        });

        Schema::create('organisation_billing_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pricing_package_id')->constrained('pricing_packages')->cascadeOnDelete();
            $table->string('customer_transaction_id')->unique();
            $table->string('basket_id')->nullable()->index();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('GBP');
            $table->string('payee_name')->nullable();
            $table->string('email')->nullable();
            $table->string('msisdn', 32)->nullable();
            $table->string('description')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->json('gateway_response')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['organisation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organisation_billing_transactions');

        Schema::table('organisations', function (Blueprint $table) {
            if (Schema::hasColumn('organisations', 'billing_phone')) {
                $table->dropColumn('billing_phone');
            }
        });
    }
};
