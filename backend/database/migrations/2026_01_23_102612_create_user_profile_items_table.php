<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profile_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('profile_item_id')->constrained()->cascadeOnDelete();

            // 取得日時
            $table->timestamp('obtained_at')->useCurrent();

            // 同じアイテムを重複所持可能にするか？ -> ガチャの仕様によるが、
            // 一般的にアバターアイテムは「所持しているか否か」なのでUnique制約をつけるのが安全。
            // 重複当選時にポイント変換するロジックはService層で実装する。
            $table->unique(['user_id', 'profile_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profile_items');
    }
};
