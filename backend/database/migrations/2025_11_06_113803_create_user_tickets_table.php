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

            // ↓↓↓ ここから追記 ↓↓↓

            // 誰が買ったか (usersテーブルと連携)
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // どの券種か (ticket_typesテーブルと連携)
            $table->foreignId('ticket_type_id')->constrained('ticket_types')->onDelete('cascade');

            // どのイベントか (event_idはticket_type_idから辿れますが、検索を高速化するためにあえて追加します)
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');

            // Stripeの決済ID (後で注文履歴を辿るため)
            $table->string('stripe_payment_id')->nullable()->index();

            // ★あなたのアイディア：指定席（ランダム割り当て）または自由席
            $table->string('seat_number')->nullable(); // (例: "S席 A-12", "自由席-001")

            // QRコードで検証するための一意のID (UUIDなど)
            $table->string('qr_code_id')->unique()->nullable();

            // チケットが使用済みか (入場時に使用済みにする)
            $table->boolean('is_used')->default(false);

            // ↑↑↑ ここまで追記 ↑↑↑

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