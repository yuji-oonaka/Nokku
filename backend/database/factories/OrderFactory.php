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
        // 1. まず注文するユーザーを決める（いなければ作る）
        $user = User::inRandomOrder()->first() ?? User::factory()->create();

        return [
            'user_id' => $user->id,
            'total_price' => fake()->numberBetween(1000, 50000),
            'status' => fake()->randomElement(['pending', 'completed', 'canceled', 'refunded']),
            'payment_method' => fake()->randomElement(['stripe', 'card']),
            'delivery_method' => fake()->randomElement(['venue', 'mail']),
            
            // 2. そのユーザーの住所を配送先としてコピーする (スナップショット)
            'shipping_address' => [
                'name' => $user->real_name, // ユーザーの本名
                'postal_code' => $user->postal_code ?? fake()->postcode(),
                'prefecture' => $user->prefecture ?? fake()->prefecture(),
                'city' => $user->city ?? fake()->city(),
                'address_line1' => $user->address_line1 ?? fake()->streetAddress(),
                'address_line2' => $user->address_line2 ?? fake()->secondaryAddress(),
            ],

            'tracking_number' => fake()->optional()->regexify('[0-9]{4}-[0-9]{4}-[0-9]{4}'),
            'created_at' => fake()->dateTimeBetween('-1 year', 'now'),
            'updated_at' => now(),
        ];
    }
}