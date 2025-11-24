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

            // 1. 誰が買ったか
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // 2. どの券種か
            $table->foreignId('ticket_type_id')->constrained('ticket_types')->onDelete('cascade');

            // 3. どのイベントか
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');

            // 4. Stripe決済ID
            $table->string('stripe_payment_id')->nullable()->index();

            // 5. 座席番号
            $table->string('seat_number')->nullable();

            // 6. QRコードID (UUIDを使用)
            $table->uuid('qr_code_id')->unique()->nullable();

            // 7. 使用済みフラグ
            $table->boolean('is_used')->default(false);

            // 8. ★ 使用日時 (これが抜けていたので追加！)
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
