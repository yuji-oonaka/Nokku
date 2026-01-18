<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_chat_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('event_id')->index(); // イベント毎に制限する場合
            $table->string('room_id')->index();
            $table->timestamp('created_at'); // 送信時刻
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_chat_logs');
    }
};
