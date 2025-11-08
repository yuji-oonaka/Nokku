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

            // 外部キー制約 (usersテーブルのidを参照)
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            $table->text('content'); // 投稿本文
            $table->string('image_url')->nullable(); // 添付画像 (任意)

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