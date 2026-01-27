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
        Schema::table('user_chat_logs', function (Blueprint $table) {
            // 1. 状態とエラー記録
            $table->string('status')->default('success')->after('room_id')->index();
            $table->string('error_code')->nullable()->after('status');

            // 2. 課金情報の証跡
            $table->boolean('is_free')->default(true)->after('error_code');
            $table->integer('consumed_points')->default(0)->after('is_free');

            // 3. Eloquent対応 (updated_at追加)
            if (!Schema::hasColumn('user_chat_logs', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
