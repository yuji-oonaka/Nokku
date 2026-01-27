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
        Schema::table('user_gacha_logs', function (Blueprint $table) {
            $table->string('status')->default('success')->after('gacha_item_id')->index();
            $table->string('error_code')->nullable()->after('status');
            $table->boolean('is_duplicate')->default(false)->after('error_code');
            $table->integer('refund_amount')->default(0)->after('is_duplicate');
            $table->timestamp('updated_at')->nullable()->after('created_at');
            // 分析用に消費ポイントも明示的に持つ（ポイント単価変更対策）
            if (!Schema::hasColumn('user_gacha_logs', 'consumed_points')) {
                $table->integer('consumed_points')->after('refund_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_gacha_logs', function (Blueprint $table) {
            //
        });
    }
};
