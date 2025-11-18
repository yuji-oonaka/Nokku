<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            // 誰が
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // どのグッズを
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            $table->timestamps(); // いつのまにか「いいねした日時」として使える

            // 重複いいね防止（ユニーク制約）
            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
