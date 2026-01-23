<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Gacha;
use App\Models\ProfileItem;

class GachaSeeder extends Seeder
{
    public function run(): void
    {
        // 1. ガチャイベント作成
        $gacha = Gacha::create([
            'name' => 'Cyberpunk Release Celebration',
            'description' => 'リリース記念！限定サイバーパンクアイテムを手に入れよう。',
            'consumption_point' => 100, // 1回100pt
            'start_at' => now()->subDay(), // 昨日から
            'end_at' => now()->addMonths(1), // 1ヶ月後まで
            'is_active' => true,
        ]);

        // 2. アイテムを詰め込む (排出設定)

        // SR: 確率低 (Weight 5)
        $srItems = ProfileItem::where('rarity', 'SR')->get();
        foreach ($srItems as $item) {
            $gacha->items()->create([
                'profile_item_id' => $item->id,
                'probability_weight' => 5, // 5/130 ≒ 3.8%
                'is_pickup' => true,
            ]);
        }

        // R: 確率中 (Weight 25)
        $rItems = ProfileItem::where('rarity', 'R')->get();
        foreach ($rItems as $item) {
            $gacha->items()->create([
                'profile_item_id' => $item->id,
                'probability_weight' => 25, // 19%
                'is_pickup' => false,
            ]);
        }

        // N: 確率高 (Weight 50)
        $nItems = ProfileItem::where('rarity', 'N')->where('is_default', false)->get();
        foreach ($nItems as $item) {
            $gacha->items()->create([
                'profile_item_id' => $item->id,
                'probability_weight' => 50, // 38%
                'is_pickup' => false,
            ]);
        }
    }
}
