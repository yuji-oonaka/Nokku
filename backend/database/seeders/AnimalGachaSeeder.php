<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gacha;
use App\Models\ProfileItem;
use App\Models\GachaItem; // 追加
use Illuminate\Support\Facades\DB;

class AnimalGachaSeeder extends Seeder
{
    public function run(): void
    {
        // トランザクションで安全に実行
        DB::transaction(function () {
            // 1. 動物ガチャを作成
            $gacha = Gacha::create([
                'name' => 'アニマルパレード Vol.1',
                'consumption_point' => 100,
                'description' => 'かわいい動物たちのアイコンが登場！ペンギンやブタさんをゲットしよう。',
                'is_active' => true,
                'start_at' => now(),
                'end_at' => null,
            ]);

            // 2. アイテムを作成
            $penguin = ProfileItem::create([
                'name' => 'ハッピーペンギン',
                'image_url' => 'gacha_items/penguin.png',
                'rarity' => 'N',
                'type' => 'icon',
                'is_default' => false,
            ]);

            $pig = ProfileItem::create([
                'name' => 'スマイルピッグ',
                'image_url' => 'gacha_items/pig.png',
                'rarity' => 'N',
                'type' => 'icon',
                'is_default' => false,
            ]);

            $robot = ProfileItem::create([
                'name' => 'ぼろっとさん',
                'image_url' => 'gacha_items/robot.png',
                'rarity' => 'R',
                'type' => 'icon',
                'is_default' => false,
            ]);

            // 3. ガチャにアイテムを登録 (createを使用)
            // カラム名を probability_weight に修正
            $gacha->items()->create([
                'profile_item_id' => $penguin->id,
                'probability_weight' => 40
            ]);

            $gacha->items()->create([
                'profile_item_id' => $pig->id,
                'probability_weight' => 40
            ]);

            $gacha->items()->create([
                'profile_item_id' => $robot->id,
                'probability_weight' => 20
            ]);

            // ログ出力
            echo "動物ガチャ「{$gacha->name}」を作成しました！\n";
        });
    }
}
