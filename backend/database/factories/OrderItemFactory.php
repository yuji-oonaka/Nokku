<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Order;
use App\Models\Product;

class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'product_id' => Product::inRandomOrder()->first()?->id ?? Product::factory(),
            'quantity' => fake()->numberBetween(1, 5),

            // ▼▼▼ 修正: DBのカラム名に合わせる ▼▼▼
            'price_at_purchase' => fake()->numberBetween(500, 10000), 
            
            // ▼▼▼ 追加: 必須項目の商品名を入れる ▼▼▼
            'product_name' => fake()->word() . ' Tシャツ', 
        ];
    }
}