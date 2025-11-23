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
        Schema::create('posts', function (Blueprint $table) {
            $table->id();

            // 1. 投稿者 (usersテーブルのidを参照)
            // 投稿者が削除されたら、その投稿も一緒に消える (cascadeOnDelete)
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // 2. タイトル (統合: add_title...)
            $table->string('title');

            // 3. 本文
            $table->text('content');

            // 4. 添付画像URL (任意)
            $table->string('image_url')->nullable();

            // 5. 公開日時 (予約投稿用) (統合: add_publishing_dates...)
            $table->timestamp('publish_at')->nullable();

            // 6. 有効期限 (自動で消す用) (統合: add_publishing_dates...)
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};