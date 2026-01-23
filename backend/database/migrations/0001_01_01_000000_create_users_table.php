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

            // --- Identity ---
            $table->string('firebase_uid')->unique(); // 修正: unique制約を明示
            $table->string('real_name');
            $table->string('nickname');
            $table->string('image_url')->nullable();
            $table->text('bio')->nullable();

            // --- Auth & Security ---
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            // Jetstream/Fortify Two Factor
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();

            // --- Roles ---
            $table->enum('role', ['user', 'artist', 'admin', 'staff', 'operator'])->default('user');
            $table->unsignedBigInteger('employer_id')->nullable();

            // --- Economy ---
            $table->integer('points')->default(0);

            // --- Contact & Address ---
            $table->string('phone_number', 20)->nullable();
            $table->string('postal_code', 8)->nullable();
            $table->string('prefecture', 10)->nullable();
            $table->string('city', 50)->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();

            // --- ★ NOKKU Gacha System (Profile Items) ---
            // ※ここで定義。timestampsはここには書かない。
            $table->foreignId('current_icon_id')
                ->nullable()
                ->constrained('profile_items')
                ->nullOnDelete();

            $table->foreignId('current_frame_id')
                ->nullable()
                ->constrained('profile_items')
                ->nullOnDelete();

            $table->foreignId('current_bg_id')
                ->nullable()
                ->constrained('profile_items')
                ->nullOnDelete();

            $table->rememberToken();

            // --- Timestamps (ここだけに記述する) ---
            $table->timestamps();
        });

        // パスワードリセットトークン (既存のまま)
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // セッション (既存のまま)
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
