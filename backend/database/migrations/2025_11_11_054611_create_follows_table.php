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
        Schema::create('follows', function (Blueprint $table) {
            // 1. フォローしたユーザー (ファン)
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // 2. フォローされたユーザー (アーティスト)
            // (users テーブルの id を参照)
            $table->foreignId('artist_id')->constrained('users')->onDelete('cascade');

            // 3. 複合プライマリキー (user_id と artist_id の組み合わせが重複しないように)
            $table->primary(['user_id', 'artist_id']);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('follows');
    }
};