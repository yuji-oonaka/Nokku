<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gacha_profile_item', function (Blueprint $table) {
            $table->id();

            // ガチャID (gachasテーブルのid)
            $table->foreignId('gacha_id')
                ->constrained()
                ->cascadeOnDelete();

            // アイテムID (profile_itemsテーブルのid)
            $table->foreignId('profile_item_id')
                ->constrained()
                ->cascadeOnDelete();

            // ★重要: 排出の重み (Weight)
            // 例: 100, 50, 1 など。
            // デフォルト1にしておけば計算エラーを防げます
            $table->integer('weight')->default(1);

            $table->timestamps();

            // データ整合性のため、同じガチャに同じアイテムを二重登録できないようにする
            $table->unique(['gacha_id', 'profile_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gacha_profile_item');
    }
};
