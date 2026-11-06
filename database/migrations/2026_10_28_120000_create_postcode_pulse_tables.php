<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->boolean('is_staff')->default(false)->after('password');
            $table->string('use_case')->nullable()->after('is_staff');
        });

        Schema::create('organisations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('credit_balance', 10, 2)->default(42.60);
            $table->decimal('monthly_spend', 10, 2)->default(0);
            $table->string('plan')->default('business');
            $table->boolean('auto_topup_enabled')->default(false);
            $table->decimal('auto_topup_amount', 10, 2)->nullable();
            $table->decimal('auto_topup_cap', 10, 2)->nullable();
            $table->string('vat_number')->nullable();
            $table->string('billing_name')->nullable();
            $table->string('card_last4')->nullable();
            $table->string('card_brand')->nullable();
            $table->string('card_expires')->nullable();
            $table->timestamps();
        });

        Schema::create('organisation_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->timestamps();
            $table->unique(['organisation_id', 'user_id']);
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('environment');
            $table->unsignedInteger('request_count')->default(0);
            $table->timestamps();
        });

        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('type');
            $table->string('environment');
            $table->string('key_prefix', 32)->index();
            $table->string('key_hash');
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('postcodes', function (Blueprint $table) {
            $table->id();
            $table->string('postcode')->unique();
            $table->string('outward');
            $table->string('inward');
            $table->string('area')->nullable();
            $table->string('post_town')->nullable();
            $table->string('country')->nullable();
            $table->string('region')->nullable();
            $table->string('admin_district')->nullable();
            $table->string('constituency')->nullable();
            $table->string('nhs_region')->nullable();
            $table->string('ceremonial_county')->nullable();
            $table->string('local_authority')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->integer('eastings')->nullable();
            $table->integer('northings')->nullable();
            $table->unsignedTinyInteger('quality')->nullable();
            $table->string('status')->default('current');
            $table->string('source')->nullable();
            $table->date('record_updated')->nullable();
            $table->timestamps();
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->string('postcode')->index();
            $table->string('building')->nullable();
            $table->string('line1')->nullable();
            $table->string('locality')->nullable();
            $table->string('post_town')->nullable();
            $table->string('uprn')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('precision')->nullable();
            $table->timestamps();
        });

        Schema::create('usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('postcode')->nullable();
            $table->string('location')->nullable();
            $table->string('endpoint');
            $table->string('status');
            $table->string('outcome');
            $table->decimal('cost', 10, 4)->default(0);
            $table->unsignedInteger('latency_ms')->default(0);
            $table->string('request_id')->unique();
            $table->string('environment');
            $table->timestamps();
        });

        Schema::create('saved_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('saved_list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saved_list_id')->constrained()->cascadeOnDelete();
            $table->string('postcode');
            $table->string('label')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        Schema::create('bulk_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('draft');
            $table->unsignedTinyInteger('step')->default(1);
            $table->string('filename')->nullable();
            $table->string('mapped_column')->nullable();
            $table->unsignedInteger('row_count')->default(0);
            $table->timestamps();
        });

        Schema::create('credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organisation_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('type');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('organisation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('uptime_pct', 5, 2)->default(99.99);
            $table->unsignedInteger('latency_ms')->default(0);
            $table->string('status')->default('Operational');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('providers');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('credit_transactions');
        Schema::dropIfExists('bulk_jobs');
        Schema::dropIfExists('saved_list_items');
        Schema::dropIfExists('saved_lists');
        Schema::dropIfExists('usage_logs');
        Schema::dropIfExists('addresses');
        Schema::dropIfExists('postcodes');
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('organisation_user');
        Schema::dropIfExists('organisations');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'is_staff', 'use_case']);
        });
    }
};
