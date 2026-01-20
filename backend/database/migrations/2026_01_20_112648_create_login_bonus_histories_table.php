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
        Schema::create('login_bonus_histories', function (Blueprint $table) {
            $table->id();
            // ユーザーID (usersテーブルと紐付け + 削除時に道連れ設定)
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 付与ポイント数 (履歴として重要)
            $table->integer('points')->comment('付与ポイント数');

            // 付与対象日 (YYYY-MM-DD)
            $table->date('awarded_date')->comment('付与対象日');

            $table->timestamps();

            // 【重要】同一ユーザー・同一日の重複登録をDBレベルで禁止
            $table->unique(['user_id', 'awarded_date'], 'unique_user_daily_bonus');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_bonus_histories');
    }
};
