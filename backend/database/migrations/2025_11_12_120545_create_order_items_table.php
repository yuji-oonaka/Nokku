<?php
// ファイル名: database/migrations/YYYY_MM_DD_XXXXXX_create_order_items_table.php

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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();

            // 1. どの注文に属しているか (orders テーブルと紐付け)
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');

            // 2. どの商品か (products テーブルと紐付け)
            // (onDelete('null') = もし商品が削除されても、注文履歴からは消さない)
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');

            // 3. いくつ買ったか
            $table->unsignedInteger('quantity');

            // 4. 「購入時点」での価格 (重要)
            // (将来、Productの価格が変わっても、注文履歴の価格は変わらないように)
            $table->unsignedInteger('price_at_purchase');

            // 5. 「購入時点」での商品名 (商品が削除されても名前を残すため)
            $table->string('product_name');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
