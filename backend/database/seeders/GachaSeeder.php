<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gacha;
use App\Models\ProfileItem;
use Illuminate\Support\Facades\DB;

class GachaSeeder extends Seeder
{
    public function run(): void
    {
        // アイテムがまだない場合のために、ダミーアイテムをいくつか作っておく（保険）
        if (ProfileItem::count() === 0) {
            $this->createDummyItems();
        }

        // 1. ガチャイベント作成
        $gacha = Gacha::create([
            'name' => 'Cyberpunk Release Celebration',
            'description' => 'リリース記念！限定サイバーパンクアイテムを手に入れよう。',
            'consumption_point' => 100,
            'start_at' => now()->subDay(),
            'end_at' => now()->addMonths(1),
            'is_active' => true,
        ]);

        // 2. アイテムを詰め込む (排出設定)
        // attach() メソッドを使用します

        // SR: 確率低 (Weight 5)
        $srItems = ProfileItem::where('rarity', 'SR')->get();
        foreach ($srItems as $item) {
            // ★修正: create ではなく attach を使い、weight カラムを指定
            $gacha->items()->attach($item->id, [
                'weight' => 5,
                // 'is_pickup' => true // 中間テーブルにカラムを作っていないので削除
            ]);
        }

        // R: 確率中 (Weight 25)
        $rItems = ProfileItem::where('rarity', 'R')->get();
        foreach ($rItems as $item) {
            $gacha->items()->attach($item->id, [
                'weight' => 25,
            ]);
        }

        // N: 確率高 (Weight 50)
        $nItems = ProfileItem::where('rarity', 'N')->where('is_default', false)->get();
        foreach ($nItems as $item) {
            $gacha->items()->attach($item->id, [
                'weight' => 50,
            ]);
        }
    }

    // テスト用に適当なアイテムを作る関数
    private function createDummyItems()
    {
        $types = ['icon', 'frame', 'background'];
        $rarities = ['N', 'R', 'SR'];

        foreach ($rarities as $rarity) {
            for ($i = 1; $i <= 3; $i++) {
                ProfileItem::create([
                    'name' => "{$rarity}アイテム {$i}",
                    'image_url' => 'gacha_items/pig.png', // 全部ブタ画像で代用
                    'rarity' => $rarity,
                    'type' => 'icon',
                    'is_default' => false,
                ]);
            }
        }
    }
}
