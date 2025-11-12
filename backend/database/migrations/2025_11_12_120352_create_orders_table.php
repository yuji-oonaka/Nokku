<?php
// ファイル名: database/migrations/YYYY_MM_DD_XXXXXX_create_orders_table.php

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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            // 1. 誰が買ったか (users テーブルと紐付け)
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // 2. 合計金額
            $table->unsignedInteger('total_price');

            // 3. 注文の状態
            // 'pending': (現金払い) 支払待ち / (Stripe) 決済処理中
            // 'paid': 支払い完了 (Stripe決済後 / 現金受取時)
            // 'shipped': (郵送) 発送済み
            // 'redeemed': (会場) 引換済み
            $table->string('status', 20)->default('pending');

            // 4. 決済方法
            $table->string('payment_method', 20); // 'stripe' or 'cash'

            // 5. 受取方法
            $table->string('delivery_method', 20); // 'mail' or 'venue'

            // 6. 配送先住所 (JSON形式でユーザーの住所をコピー)
            // 注文「時点」の住所を保存するため、JSONで固めて保存します
            $table->json('shipping_address')->nullable();

            // 7. Stripe決済ID (Stripe支払いの場合のみ)
            $table->string('stripe_payment_intent_id')->nullable()->index();

            $table->timestamps(); // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
