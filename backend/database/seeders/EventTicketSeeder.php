<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User; // 👈 1. 必要なモデルを use
use App\Models\Event;
use App\Models\TicketType;

class EventTicketSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 2. run() メソッドに以下を記述

        // 1. 管理者アーティストを取得
        $artist = User::where('role', 'admin')->first();

        // もし管理者が見つからなければ処理を中断
        if (!$artist) {
            $this->command->error('管理者ユーザーが見つかりません。UserSeederを先に実行してください。');
            return;
        }

        // 2. テストイベントを作成
        $event = Event::firstOrCreate(
            ['title' => 'NOKKU SPECIAL LIVE'], // このタイトルで探す
            [
                'description' => 'NOKKUアプリのローンチを記念したスペシャルライブ！S席・A席・自由席をご用意。',
                'venue' => 'Zepp Fukuoka',
                'event_date' => '2025-12-24 18:00:00', // 未来の日付
                'artist_id' => $artist->id,
            ]
        );

        // 3. テスト券種（S席・A席・自由席）を作成
        TicketType::firstOrCreate(
            ['event_id' => $event->id, 'name' => 'S席'], // S席
            [
                'price' => 8000, 
                'capacity' => 100,
                'seating_type' => 'random' // ランダム割り当て
            ]
        );
        TicketType::firstOrCreate(
            ['event_id' => $event->id, 'name' => 'A席'], // A席
            [
                'price' => 6000, 
                'capacity' => 300,
                'seating_type' => 'random' // ランダム割り当て
            ]
        );
        TicketType::firstOrCreate(
            ['event_id' => $event->id, 'name' => '自由席'], // 自由席
            [
                'price' => 4000, 
                'capacity' => 500,
                'seating_type' => 'free' // 自由席
            ]
        );
    }
}