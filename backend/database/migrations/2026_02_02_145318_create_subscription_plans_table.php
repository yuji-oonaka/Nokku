<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('plan_id')->unique();     // 'entry', 'standard' など
            $table->integer('rank')->default(1);     // 並び順・強さ
            $table->string('name');                  // プラン表示名

            // ★ テックリードの助言：表示用テキストではなく「数値」で持つ
            $table->integer('price_yen');            // 100, 500, 2000
            $table->integer('monthly_points');       // 300, 2000, 10000

            $table->text('description');             // 説明文
            $table->string('stripe_price_id');       // Stripeの価格ID (price_1Srt...)
            $table->string('color_code');            // UIの色 (#CD7F32 など)
            $table->boolean('is_recommended')->default(false); // おすすめフラグ

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
