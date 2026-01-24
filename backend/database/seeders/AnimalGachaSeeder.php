<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gacha;
use App\Models\ProfileItem;
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
                'start_at' => now(), // すぐ開始
                'end_at' => null,    // 無期限（恒常）
            ]);

            // 2. アイテムを作成
            // 画像パスは storage/app/public/gacha_items/penguin.jpg を指します
            // DBには 'gacha_items/penguin.jpg' と保存するのが一般的です

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

            // 3. ガチャにアイテムを登録し、確率(weight)を設定！
            // 合計 100 になるように設定してみます (50:50)

            $gacha->items()->attach($penguin->id, ['weight' => 50]);
            $gacha->items()->attach($pig->id,     ['weight' => 50]);

            // ログ出力
            echo "動物ガチャ「{$gacha->name}」を作成しました！\n";
        });
    }
}
