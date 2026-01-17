<?php

namespace Database\Factories;

use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Inquiry>
 */
class InquiryFactory extends Factory
{
    protected $model = Inquiry::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(), // デフォルトでは新規作成するが、Seederで上書き推奨
            'subject' => $this->faker->realText(30),
            'message' => $this->faker->realText(200),
            'status' => 'open',
            'is_escalated' => false,
            'escalation_reason' => null,
            'handled_at' => null,
            // デフォルトはアプリへの問い合わせ（targetなし）
            'target_type' => null,
            'target_id' => null,
            'organizer_id' => null,
        ];
    }

    /**
     * 解決済み (Closed)
     */
    public function closed(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'closed',
            'handled_at' => now(),
        ]);
    }

    /**
     * エスカレーション済み (運営対応待ち)
     */
    public function escalated(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_escalated' => true,
            'escalation_reason' => '主催者と連絡が取れません。返金対応をお願いします。',
            'status' => 'open', // 運営にとってはOpen
        ]);
    }
}
