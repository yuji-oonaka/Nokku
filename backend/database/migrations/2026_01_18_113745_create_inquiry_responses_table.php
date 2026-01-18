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
        Schema::create('inquiry_responses', function (Blueprint $table) {
            $table->id();

            // どの問い合わせへの返信か
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();

            // 送信者（ユーザーまたは運営/主催者）
            // アカウント削除されても履歴は残すため nullOnDelete
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // 運営・主催者側からの返信フラグ (true: 運営/主催者, false: ユーザー)
            $table->boolean('is_admin')->default(false)->comment('true:運営/主催者, false:ユーザー');

            // メッセージ本文
            $table->text('body');

            // 既読フラグ（バッジ通知用）
            $table->boolean('is_read')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inquiry_responses');
    }
};
