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
        Schema::create('user_tickets', function (Blueprint $table) {
            $table->id();

            // 1. 誰のチケットか、どの注文から生まれたか
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('cascade'); // ★追加: 注文基盤との統合

            // 2. どのイベントの、どの券種か
            $table->foreignId('ticket_type_id')->constrained('ticket_types')->onDelete('cascade');
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');

            // 3. 決済・管理情報
            $table->string('stripe_payment_id')->nullable()->index(); // 予備として維持
            $table->string('seat_number')->nullable();
            $table->uuid('qr_code_id')->unique()->nullable();

            // 4. ステータス管理 (NOKKU憲法に基づき詳細化)
            // default: valid (有効), used (使用済), cancelled (無効)
            $table->string('status')->default('valid')->index(); // ★追加: booleanから拡張
            $table->timestamp('used_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_tickets');
    }
};
