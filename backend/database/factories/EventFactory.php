<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class EventFactory extends Factory
{
    public function definition(): array
    {
        // ライブタイトルのパーツ
        $prefixes = ['2025 TOUR', 'Anniversary Live', 'Special Live', '真夏の', '冬の', '爆音', '伝説の', 'Final Tour', 'First Live'];
        $suffixes = ['"RESTART"', '"THE FIRST"', 'in JAPAN', '〜旅立ち〜', '〜絆〜', '〜無限大〜', 'Vol.1', 'Returns'];

        // 説明文のパターン
        $descriptions = [
            "待望の全国ツアーがついに決定！\n最高のパフォーマンスをお届けします。",
            "一夜限りのスペシャルライブ。\nこの日しか見られない演出をお見逃しなく。",
            "アルバムリリース記念イベント。\n新曲を多数披露する予定です。",
            "ファン感謝祭ライブ！\nトークあり、ライブありの特別な時間。",
            "アコースティック編成でのライブ。\n普段とは違う雰囲気をお楽しみください。",
        ];

        // 会場
        $venues = ['Zepp Fukuoka', '福岡ドーム', 'マリンメッセ福岡', '福岡サンパレス', '博多市民会館', 'DRUM LOGOS', 'キャナルシティ劇場'];

        return [
            'title' => $this->faker->randomElement($prefixes) . ' ' . $this->faker->randomElement($suffixes),

            'description' => $this->faker->randomElement($descriptions),

            'venue' => $this->faker->randomElement($venues),

            'event_date' => $this->faker->dateTimeBetween('-1 week', '+3 months'),
            'image_url' => 'https://picsum.photos/800/600?random=' . $this->faker->unique()->numberBetween(1, 1000),
        ];
    }
}
