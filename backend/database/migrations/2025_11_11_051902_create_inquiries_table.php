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
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();

            // 1. 通報者 (既存の user_id を維持)
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // 2. 通報対象 (ポリモーフィック: user, event, appなど)
            // 例: target_type='App\Models\User', target_id=5
            $table->string('target_type')->nullable()->comment('通報対象のモデル名');
            $table->unsignedBigInteger('target_id')->nullable()->comment('通報対象のID');
            $table->index(['target_type', 'target_id']);

            // 3. 一次対応責任者 (主催者など)
            // 運営直通報や未割当の場合は NULL
            $table->foreignId('organizer_id')->nullable()->constrained('users')->nullOnDelete();

            // 4. 内容
            $table->string('subject');
            $table->text('message');

            // 5. ステータス (open, in_review, closed)
            $table->string('status')->default('open')->comment('open, in_review, closed');

            // 6. エスカレーション管理
            $table->boolean('is_escalated')->default(false)->comment('運営介入フラグ');
            $table->text('escalation_reason')->nullable();

            // 7. 対応完了日時 (SLA計測用)
            $table->timestamp('handled_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
