<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'real_name' => $this->faker->name(),
            'nickname' => $this->faker->unique()->userName,
            'email' => $this->faker->unique()->safeEmail(),
            'role' => 'user',
            'password' => Hash::make('password'),
            // firebase_uid はSeederで上書きするのでダミーでOK
            'firebase_uid' => Str::uuid(),
            'image_url' => 'https://i.pravatar.cc/150?u=' . $this->faker->unique()->safeEmail(),
            'postal_code' => fake()->postcode(),
            'prefecture' => fake()->prefecture(),
            'city' => fake()->city(),
            'address_line1' => fake()->streetAddress(),
            'address_line2' => fake()->secondaryAddress(),
            'phone_number' => fake()->phoneNumber(),
        ];
    }

    // アーティスト用の状態
    public function artist(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'role' => 'artist',
            ];
        });
    }
}
