<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gacha;
use App\Models\ProfileItem;
use App\Models\GachaItem; // 追加

class GachaSeeder extends Seeder
{
    public function run(): void
    {
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

        // 2. 排出設定 (GachaItemの作成)
        // attach() ではなく create() を使用します

        // SR: 確率低 (Weight 5)
        $srItems = ProfileItem::where('rarity', 'SR')->get();
        foreach ($srItems as $item) {
            $gacha->items()->create([
                'profile_item_id' => $item->id,
                'probability_weight' => 5, // マイグレーションのカラム名に合わせる
            ]);
        }

        // R: 確率中 (Weight 25)
        $rItems = ProfileItem::where('rarity', 'R')->get();
        foreach ($rItems as $item) {
            $gacha->items()->create([
                'profile_item_id' => $item->id,
                'probability_weight' => 25,
            ]);
        }

        // N: 確率高 (Weight 50)
        $nItems = ProfileItem::where('rarity', 'N')->where('is_default', false)->get();
        foreach ($nItems as $item) {
            $gacha->items()->create([
                'profile_item_id' => $item->id,
                'probability_weight' => 50,
            ]);
        }
    }

    private function createDummyItems()
    {
        $rarities = ['N', 'R', 'SR'];
        foreach ($rarities as $rarity) {
            for ($i = 1; $i <= 3; $i++) {
                ProfileItem::create([
                    'name' => "{$rarity}アイテム {$i}",
                    'image_url' => 'gacha_items/default.png',
                    'rarity' => $rarity,
                    'type' => 'icon',
                    'is_default' => false,
                ]);
            }
        }
    }
}
