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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            
            // ↓↓↓ ここから追記 ↓↓↓

            $table->string('title'); // イベントタイトル
            $table->text('description'); // イベント詳細
            $table->string('venue'); // 開催場所
            $table->dateTime('event_date'); // 開催日時

            // usersテーブルのidと関連付ける (外部キー)
            // 'role'が'artist'のユーザーIDが入ることを想定
            $table->foreignId('artist_id')->constrained('users');

            // ↑↑↑ ここまで追記 ↑↑↑
            
            $table->timestamps(); // created_at と updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};