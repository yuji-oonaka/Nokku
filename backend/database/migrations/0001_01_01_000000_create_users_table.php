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
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Firebase UID (必須)
            $table->string('firebase_uid')->unique();

            // 名前関連
            $table->string('real_name');
            $table->string('nickname');

            // プロフィール画像と自己紹介
            $table->string('image_url')->nullable();
            $table->text('bio')->nullable();

            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();

            // 2要素認証
            $table->string('two_factor_secret')->nullable();
            $table->string('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();

            // 権限管理
            $table->enum('role', ['user', 'artist', 'admin', 'staff'])->default('user');

            // ★追加: 雇用主ID (Staffの場合、どのArtistに雇われているか)
            // constrained('users') で自分自身(usersテーブル)を参照します
            $table->foreignId('employer_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // ポイント残高
            $table->integer('points')->default(0);

            // 住所情報
            $table->string('phone_number', 20)->nullable();
            $table->string('postal_code', 8)->nullable();
            $table->string('prefecture', 10)->nullable();
            $table->string('city', 50)->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();

            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
