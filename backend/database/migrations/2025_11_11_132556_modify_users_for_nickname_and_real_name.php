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
        Schema::table('users', function (Blueprint $table) {
            // 1. ★ 'name' カラムを 'real_name' (本名) にリネーム
            $table->renameColumn('name', 'real_name');

            // 2. ★ 'nickname' (公開名) カラムを新しく追加
            // (email の後ろに追加)
            $table->string('nickname')->after('email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 'up' と逆の操作

            // 1. 'nickname' カラムを削除
            $table->dropColumn('nickname');

            // 2. 'real_name' カラムを 'name' に戻す
            $table->renameColumn('real_name', 'name');
        });
    }
};