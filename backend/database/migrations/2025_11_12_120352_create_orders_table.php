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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();

            // 1. 誰が買ったか
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // 2. 合計金額
            $table->unsignedInteger('total_price');

            // 3. 注文の状態 ('pending', 'paid', 'shipped', 'redeemed')
            $table->string('status', 20)->default('pending');

            // 4. 決済方法 ('stripe', 'cash')
            $table->string('payment_method', 20);

            // 5. 受取方法 ('mail', 'venue')
            $table->string('delivery_method', 20);

            // 6. 配送先住所 (JSON形式)
            $table->json('shipping_address')->nullable();

            // 7. Stripe決済ID
            $table->string('stripe_payment_intent_id')->nullable()->index();

            // 8. ★ 統合: 会場受取用QRコードID (UUID)
            $table->uuid('qr_code_id')->nullable()->unique();

            $table->timestamps();
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
