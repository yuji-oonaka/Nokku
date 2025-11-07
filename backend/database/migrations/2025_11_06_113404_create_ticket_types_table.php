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
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();

            // ↓↓↓ ここから追記 ↓↓↓

            // どのイベントの券種か (eventsテーブルと連携)
            $table->foreignId('event_id')->constrained('events')->onDelete('cascade');

            $table->string('name'); // 券種名 (例: "S席", "A席", "自由席")
            $table->unsignedInteger('price'); // 価格 (例: 8000)
            $table->unsignedInteger('capacity'); // 販売枚数 (例: 100)

            // 座席タイプ（ランダム割り当て or 自由席）
            $table->enum('seating_type', ['random', 'free'])->default('free');

            // ↑↑↑ ここまで追記 ↑↑↑

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_types');
    }
};