<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LoginBonusConfig;

class LoginBonusConfigSeeder extends Seeder
{
    public function run(): void
    {
        // 既にデータがある場合はスキップし、なければ5pt設定を投入
        LoginBonusConfig::firstOrCreate(
            ['id' => 1],
            [
                'amount' => 5,
                'is_active' => true,
            ]
        );
    }
}
