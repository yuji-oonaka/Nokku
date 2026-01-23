<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_items', function (Blueprint $table) {
            $table->id();
            // icon, frame, background
            $table->string('type')->index();
            // 管理用名称 (例: "サイバーパンクフレーム")
            $table->string('name');
            // 画像パス (asset_path禁止, image_urlに統一)
            $table->string('image_url');
            // N, R, SR
            $table->string('rarity')->default('N');
            // 排出重み (1-100等)
            $table->integer('probability_weight')->default(1);
            // 初期所持フラグ
            $table->boolean('is_default')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_items');
    }
};
