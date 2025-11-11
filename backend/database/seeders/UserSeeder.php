<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User; // 1. User モデルを use
use Illuminate\Support\Facades\Hash; // 2. Hash を use

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 3. ★ 一般ユーザー (user@nokku.com) を作成
        User::firstOrCreate(
            ['email' => 'user@nokku.com'], // この email が存在しなかったら
            [ // 以下のデータで作成する
                'name' => '一般ユーザー',
                'password' => Hash::make('password'),
                'role' => 'user',
                'firebase_uid' => 'USER_PLACEHOLDER_UID', // ログインには本物のUIDが必要
            ]
        );

        // 4. ★ 管理者/アーティスト (admin@nokku.com) を作成
        User::firstOrCreate(
            ['email' => 'admin@nokku.com'], // この email が存在しなかったら
            [ // 以下のデータで作成する
                'name' => '管理者アーティスト',
                'password' => Hash::make('password'),
                'role' => 'admin',
                // ログインには本物のUIDが必要だが、seed時にはプレースホルダを入れる
                'firebase_uid' => 'ADMIN_PLACEHOLDER_UID', 
            ]
        );
    }
}