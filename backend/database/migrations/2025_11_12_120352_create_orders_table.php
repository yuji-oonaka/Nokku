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

            // 2. 金額関連
            $table->unsignedInteger('total_price');

            // ★統合: 手数料関連 (Commission)
            // 金額計算に関わるので total_price の直後に配置
            $table->decimal('platform_fee', 10, 2)->default(0)->comment('プラットフォーム手数料');
            $table->decimal('payout_amount', 10, 2)->default(0)->comment('アーティスト受取額');

            // 3. 注文の状態 ('pending', 'paid', 'shipped', 'redeemed')
            $table->string('status', 20)->default('pending');

            // 4. 決済方法 ('stripe', 'cash')
            $table->string('payment_method', 20);

            // 5. 受取方法 ('mail', 'venue')
            $table->string('delivery_method', 20);

            // ★統合: 追跡番号関連 (Tracking)
            $table->string('tracking_number')->nullable()->comment('追跡番号');
            $table->timestamp('shipped_at')->nullable()->comment('発送日時');

            // 6. 配送先住所 (JSON形式)
            $table->json('shipping_address')->nullable();

            // 7. Stripe決済ID
            $table->string('stripe_payment_intent_id')->nullable()->index();

            // 8. 会場受取用QRコードID (UUID)
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
