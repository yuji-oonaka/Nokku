<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ガチャ筐体 (イベント/バナー)
        Schema::create('gachas', function (Blueprint $table) {
            $table->id();
            $table->string('name')->comment('ガチャ名 (例: サイバーパンク特集)');
            $table->text('description')->nullable();
            $table->integer('consumption_point')->default(100)->comment('1回あたりの消費ポイント');

            // 開催期間
            $table->dateTime('start_at')->nullable();
            $table->dateTime('end_at')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });

        // 2. ガチャの中身 (排出設定)
        Schema::create('gacha_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gacha_id')->constrained()->cascadeOnDelete();

            // ★重要: ここで前回作った profile_items を参照する
            $table->foreignId('profile_item_id')
                ->constrained('profile_items')
                ->cascadeOnDelete();

            // 排出確率の重み (例: 10, 50, 100)
            // profile_items側にもweightはあるが、ガチャ筐体ごとに確率を変えたい場合にこちらを優先する設計
            $table->integer('probability_weight')->default(1);

            // 演出用フラグ
            $table->boolean('is_pickup')->default(false)->comment('ピックアップ(目玉)商品フラグ');

            $table->timestamps();

            // 同じガチャに同じアイテムを重複登録しない
            $table->unique(['gacha_id', 'profile_item_id']);
        });

        // 3. 抽選ログ (履歴用)
        // ※実際の所持は user_profile_items テーブルで管理するが、
        //   「いつ」「どのガチャで」「何が出たか」の証跡として残す
        Schema::create('user_gacha_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gacha_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gacha_item_id')->constrained('gacha_items')->cascadeOnDelete();

            // 当時の消費ポイントなどをスナップショット保存しておくと、後で価格改定があっても揉めない
            $table->integer('consumed_points');

            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_gacha_logs');
        Schema::dropIfExists('gacha_items');
        Schema::dropIfExists('gachas');
    }
};
