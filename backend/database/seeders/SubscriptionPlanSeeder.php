<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SubscriptionPlan;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'plan_id' => 'entry',
                'rank' => 1,
                'name' => '🥉 お試し応援プラン',
                'price_yen' => 100,
                'monthly_points' => 300,
                'description' => "ちょっとだけ足したい方向け。\nログボと合わせて月500pt以上！",
                'stripe_price_id' => 'price_1SrtKaLcIj5T4QhVZAb8tPlW',
                'color_code' => '#CD7F32',
                'is_recommended' => false,
            ],
            [
                'plan_id' => 'standard',
                'rank' => 2,
                'name' => '🥈 スタンダードプラン',
                'price_yen' => 500,
                'monthly_points' => 2000,
                'description' => "【人気No.1】コミュニティの主力へ。\n毎日チャットを楽しみたい方に。",
                'stripe_price_id' => 'price_1SrtIwLcIj5T4QhVzPiQehvg',
                'color_code' => '#C0C0C0',
                'is_recommended' => true,
            ],
            [
                'plan_id' => 'royal',
                'rank' => 3,
                'name' => '🥇 VIPプラン',
                'price_yen' => 2000,
                'monthly_points' => 10000,
                'description' => "圧倒的コスパ。ガチャも会話も\n思う存分楽しみたい王様へ。",
                'stripe_price_id' => 'price_1SrtLZLcIj5T4QhV3Gxj32wH',
                'color_code' => '#FFD700',
                'is_recommended' => false,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(['plan_id' => $plan['plan_id']], $plan);
        }
    }
}
