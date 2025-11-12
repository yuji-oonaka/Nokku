<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. 一般ユーザー
        User::firstOrCreate(
            ['email' => 'user@nokku.com'],
            [
                // 'name' => '一般ユーザー', // 👈 削除
                'real_name' => '一般 太郎', // 👈 'real_name' (本名) を追加
                'nickname' => '一般ユーザー', // 👈 'nickname' (公開名) を追加
                'password' => Hash::make('password'),
                'role' => 'user',
                'firebase_uid' => 'USER_PLACEHOLDER_UID',
            ]
        );

        // 2. 管理者
        User::firstOrCreate(
            ['email' => 'admin@nokku.com'],
            [
                // 'name' => '管理者アーティスト', // 👈 削除
                'real_name' => '管理 太郎', // 👈 'real_name' を追加
                'nickname' => 'NOKKU運営', // 👈 'nickname' を追加
                'password' => Hash::make('password'),
                'role' => 'admin',
                'firebase_uid' => 'ADMIN_PLACEHOLDER_UID',
            ]
        );

        // 3. テストアーティスト
        User::firstOrCreate(
            ['email' => 'artist@nokku.com'],
            [
                // 'name' => 'テストアーティスト', // 👈 削除
                'real_name' => '手巣戸 亜手須斗', // 👈 'real_name' を追加
                'nickname' => 'テストアーティスト', // 👈 'nickname' を追加
                'password' => Hash::make('password'),
                'role' => 'artist',
                'firebase_uid' => 'ARTIST_PLACEHOLDER_UID',
            ]
        );
    }
}