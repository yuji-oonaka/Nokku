<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        // 商品名のパターン
        $adjectives = ['ツアーロゴ', '限定', '2025 ver.', 'メンバープロデュース', '復刻版', '会場限定', 'サイン入り'];
        $items = ['Tシャツ', 'マフラータオル', 'ペンライト', 'アクリルスタンド', 'トートバッグ', 'ラバーバンド', 'ステッカーセット', 'パンフレット', 'キーホルダー'];

        // 説明文のパターン
        $descriptions = [
            "ライブの定番アイテム！\nこれを持って盛り上がりましょう。",
            "使いやすいデザインで普段使いにもおすすめ。\n素材にもこだわりました。",
            "今回のツアー限定のデザインです。\n在庫に限りがありますのでお早めに。",
            "メンバーがデザインを監修しました！\nこだわりが詰まった一品です。",
            "全5種類の中からランダムで1つ当たります。\n何が出るかはお楽しみ！",
        ];

        return [
            'name' => $this->faker->randomElement($adjectives) . ' ' . $this->faker->randomElement($items),

            'description' => $this->faker->randomElement($descriptions),

            'price' => $this->faker->randomElement([500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000]),
            'stock' => $this->faker->numberBetween(10, 100),
            'limit_per_user' => $this->faker->randomElement([null, 1, 2, 3, 5]),
            'image_url' => 'https://picsum.photos/400/400?random=' . $this->faker->unique()->numberBetween(1001, 2000),
        ];
    }
}
