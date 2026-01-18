<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'points')) {
                $table->integer('points')->default(0)->after('email');
            }
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('user')->after('points');
            }
        });

        if (!Schema::hasTable('point_transactions')) {
            Schema::create('point_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();

                $table->integer('amount'); // 金額

                // ★復活: 用途分類 (必須) -> gacha, chat, donation
                $table->string('type')->index();

                $table->string('description'); // 明細

                // ★変更: reference_id を廃止し、より柔軟な metadata (JSON) を採用
                // これなら「イベントID」と「ルームID」を両方綺麗に保存できます
                $table->json('metadata')->nullable();

                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('point_transactions');
        // usersのカラム削除処理は省略
    }
};
