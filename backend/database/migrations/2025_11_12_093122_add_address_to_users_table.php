<?php
// ファイル名: database/migrations/YYYY_MM_DD_XXXXXX_add_address_to_users_table.php

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
        // 'users' テーブルにカラムを追加します
        Schema::table('users', function (Blueprint $table) {
            // 'role' カラムの後ろに追加していきます
            $table->string('phone_number', 20)->nullable()->after('role');
            $table->string('postal_code', 8)->nullable()->after('phone_number'); // 例: 123-4567
            $table->string('prefecture', 10)->nullable()->after('postal_code'); // 例: 東京都
            $table->string('city', 50)->nullable()->after('prefecture'); // 例: 渋谷区
            $table->string('address_line1')->nullable()->after('city'); // 例: 恵比寿1-2-3
            $table->string('address_line2')->nullable()->after('address_line1'); // 例: アパート101号室
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // マイグレーションを戻す（ロールバック）時の処理
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone_number',
                'postal_code',
                'prefecture',
                'city',
                'address_line1',
                'address_line2',
            ]);
        });
    }
};
