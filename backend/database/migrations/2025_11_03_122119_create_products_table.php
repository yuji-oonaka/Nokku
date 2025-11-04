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

            // ↓↓↓ ここから追記 ↓↓↓

            $table->string('name'); // グッズ名
            $table->text('description'); // グッズ詳細
            $table->unsignedInteger('price'); // 価格
            $table->unsignedInteger('stock'); // 在庫数
            $table->string('image_url')->nullable(); // 商品画像URL (後でS3などに変更も可)

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
        Schema::dropIfExists('products');
    }
};