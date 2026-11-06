<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_packages', function (Blueprint $table) {
            $table->unsignedInteger('monthly_api_calls')->nullable()->after('is_active');
        });

        DB::table('pricing_packages')->where('slug', 'public')->update(['monthly_api_calls' => 100]);
        DB::table('pricing_packages')->where('slug', 'credits')->update(['monthly_api_calls' => 500]);
        DB::table('pricing_packages')->where('slug', 'business')->update(['monthly_api_calls' => 10000]);
        DB::table('pricing_packages')->where('slug', 'enterprise')->update(['monthly_api_calls' => null]);
    }

    public function down(): void
    {
        Schema::table('pricing_packages', function (Blueprint $table) {
            $table->dropColumn('monthly_api_calls');
        });
    }
};
