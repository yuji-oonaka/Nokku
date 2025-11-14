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
        Schema::table('posts', function (Blueprint $table) {
            // 'image_url' カラムの後ろに追加します

            // 公開日時 (予約投稿用)
            // (nullable = 空でもOK。空の場合は即時公開)
            $table->timestamp('publish_at')->nullable()->after('image_url');

            // 有効期限 (自動で消す用)
            // (nullable = 空でもOK。空の場合は無期限)
            $table->timestamp('expires_at')->nullable()->after('publish_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['publish_at', 'expires_at']);
        });
    }
};
