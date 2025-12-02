<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            // ユーザー
            'user_id' => User::inRandomOrder()->first()?->id ?? User::factory(),
            
            // 合計金額
            'total_price' => fake()->numberBetween(1000, 50000),
            
            // ステータス
            'status' => fake()->randomElement(['pending', 'completed', 'canceled', 'refunded']),

            // ▼▼▼ ここを追加してください！ ▼▼▼
            // DBにデフォルト値がないので、ここで必ず指定する必要があります
            'payment_method' => fake()->randomElement(['stripe', 'card']), 
            'delivery_method' => fake()->randomElement(['venue', 'mail']),
            // ▲▲▲ 追加終わり ▲▲▲
            
            // 日付
            'created_at' => fake()->dateTimeBetween('-1 year', 'now'),
            'updated_at' => now(),
        ];
    }
}