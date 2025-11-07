<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User; // 👈 1. Userモデルを use
use Illuminate\Support\Facades\Hash; // 👈 2. Hashを use

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 3. run() メソッドに以下を記述
        
        // 管理者ユーザー（アーティスト兼任）を作成
        User::firstOrCreate(
            ['email' => 'admin@nokku.com'], // このメールアドレスで検索
            [
                // Firebase UIDは、初回ログイン時にFirebaseApiAuthミドルウェアが
                // DBに存在しないユーザーを検知した際に更新するロジックが
                // 必要ですが、現状の実装ではログイン前にDBに存在する必要があるため、
                // ここでは仮のUIDを入れます。
                // 実際には、このメールアドレスでFirebase Auth側にも手動でユーザーを作る必要があります。
                'firebase_uid' => 'ADMIN_UID_001', 
                'name' => '管理者アーティスト',
                'password' => Hash::make('password'), // ログインはFirebaseで行うためダミー
                'role' => 'admin' // ★管理者権限
            ]
        );

        // （オプション）テスト用の一般ユーザー
        User::firstOrCreate(
            ['email' => 'user@nokku.com'],
            [
                'firebase_uid' => 'USER_UID_001',
                'name' => '一般ユーザー',
                'password' => Hash::make('password'),
                'role' => 'user' // ★一般ユーザー権限
            ]
        );
    }
}