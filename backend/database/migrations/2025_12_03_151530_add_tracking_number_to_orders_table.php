<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // 追跡番号 (例: 1234-5678-9012)
            $table->string('tracking_number')->nullable()->after('delivery_method')->comment('追跡番号');
            
            // 発送日時
            $table->timestamp('shipped_at')->nullable()->after('tracking_number')->comment('発送日時');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['tracking_number', 'shipped_at']);
        });
    }
};
