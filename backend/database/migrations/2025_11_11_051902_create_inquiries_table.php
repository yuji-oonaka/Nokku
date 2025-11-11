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
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();

            // 1. 誰からのお問い合わせか (users テーブルと連携)
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // 2. お問い合わせの件名 (例: 決済について, バグ報告)
            $table->string('subject');

            // 3. お問い合わせの本文
            $table->text('message');

            // 4. 対応ステータス (運営者/管理者が使う)
            $table->enum('status', ['pending', 'resolved'])->default('pending');

            $table->timestamps(); // 送信日時
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};