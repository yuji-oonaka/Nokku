<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // （管理者は Firebase 経由で手動で作成する）

        // テスト用の一般ユーザー（毎回クリーンに作成される）
        User::firstOrCreate(
            ['email' => 'user@nokku.com'],
            [
                'firebase_uid' => 'USER_UID_001_PLACEHOLDER', // ログイン時には使われない仮のUID
                'name' => '一般ユーザー',
                'password' => Hash::make('password'),
                'role' => 'user'
            ]
        );
    }
}