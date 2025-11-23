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
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            $table->string('name');        // グッズ名
            $table->text('description');   // グッズ詳細
            $table->unsignedInteger('price'); // 価格
            $table->unsignedInteger('stock'); // 在庫数

            // ★ 統合: 購入制限 (null = 無制限)
            $table->integer('limit_per_user')->nullable();

            $table->string('image_url')->nullable(); // 商品画像URL

            // アーティストID (ユーザーが消えたらグッズも消える設定を追加)
            $table->foreignId('artist_id')->constrained('users')->cascadeOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
