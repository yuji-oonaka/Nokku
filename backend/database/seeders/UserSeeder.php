<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. 一般ユーザー (変更なし)
        User::firstOrCreate(
            ['email' => 'user@nokku.com'],
            [
                'name' => '一般ユーザー',
                'password' => Hash::make('password'),
                'role' => 'user',
                'firebase_uid' => 'USER_PLACEHOLDER_UID',
            ]
        );

        // 2. 管理者 (変更なし)
        User::firstOrCreate(
            ['email' => 'admin@nokku.com'],
            [
                'name' => '管理者',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'firebase_uid' => 'ADMIN_PLACEHOLDER_UID',
            ]
        );

        // 3. ★↓↓↓ テストアーティストを追加 ↓↓↓
        User::firstOrCreate(
            ['email' => 'artist@nokku.com'],
            [
                'name' => 'テストアーティスト',
                'password' => Hash::make('password'),
                'role' => 'artist', // 👈 ロールを 'artist' に設定
                'firebase_uid' => 'ARTIST_PLACEHOLDER_UID', // 仮のUID
            ]
        );
        // ↑↑↑ ★ ここまで追加 ★ ↑↑↑
    }
}