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
        Schema::create('login_bonus_configs', function (Blueprint $table) {
            $table->id();
            $table->integer('amount')->default(5)->comment('付与ポイント数');
            $table->boolean('is_active')->default(true)->comment('機能の有効/無効');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('login_bonus_configs');
    }
};
