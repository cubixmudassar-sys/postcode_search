<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline')->nullable();
            $table->string('currency', 3)->default('GBP');
            $table->decimal('amount', 10, 2)->nullable();
            $table->string('amount_prefix')->nullable();
            $table->string('billing_period')->nullable();
            $table->string('custom_price_label')->nullable();
            $table->json('features')->nullable();
            $table->string('cta_label')->default('Choose option');
            $table->string('cta_target')->default('create-account');
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_packages');
    }
};
