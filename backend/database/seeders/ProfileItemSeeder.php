<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProfileItem;

class ProfileItemSeeder extends Seeder
{
    public function run(): void
    {
        // 1. 基本アイテム (デフォルト所持)
        $defaults = [
            [
                'type' => 'icon',
                'name' => 'Default Geometric',
                'image_url' => 'profile/icons/default_geo.png',
                'rarity' => 'N',
                'is_default' => true,
            ],
            [
                'type' => 'frame',
                'name' => 'Simple Circle',
                'image_url' => 'profile/frames/simple_circle.png',
                'rarity' => 'N',
                'is_default' => true,
            ],
        ];

        foreach ($defaults as $item) {
            ProfileItem::firstOrCreate(['name' => $item['name']], $item);
        }

        // 2. ガチャ用アイテム (Cyberpunk Set)
        $gachaItems = [
            // SR: 激レア
            [
                'type' => 'frame',
                'name' => 'Neon Holo Frame',
                'image_url' => 'profile/frames/neon_holo.png',
                'rarity' => 'SR',
                'is_default' => false,
            ],
            [
                'type' => 'background',
                'name' => 'Cyber City Night',
                'image_url' => 'profile/bg/cyber_city.png',
                'rarity' => 'SR',
                'is_default' => false,
            ],
            // R: レア
            [
                'type' => 'icon',
                'name' => 'Glitch Cat',
                'image_url' => 'profile/icons/glitch_cat.png',
                'rarity' => 'R',
                'is_default' => false,
            ],
            // N: ノーマル
            [
                'type' => 'frame',
                'name' => 'Metal Border',
                'image_url' => 'profile/frames/metal_border.png',
                'rarity' => 'N',
                'is_default' => false,
            ],
            [
                'type' => 'background',
                'name' => 'Digital Rain',
                'image_url' => 'profile/bg/digital_rain.png',
                'rarity' => 'N',
                'is_default' => false,
            ],
        ];

        foreach ($gachaItems as $item) {
            ProfileItem::firstOrCreate(['name' => $item['name']], $item);
        }
    }
}
