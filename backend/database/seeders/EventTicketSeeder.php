<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User; // 1. User を use
use App\Models\Event; // 2. Event を use
use App\Models\TicketType; // 3. TicketType を use

class EventTicketSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 4. ★ admin@nokku.com ユーザーをDBから探す
        $artist = User::where('email', 'admin@nokku.com')->first();

        // 5. ★ もし管理者ユーザーが見つかったら、イベントを作成
        if ($artist) {
            // 6. ★ テストイベントを作成 (firstOrCreate を使用)
            $event = Event::firstOrCreate(
                ['title' => 'NOKKU SPECIAL LIVE'], // この title がなかったら
                [ // 以下のデータで作成する
                    'description' => 'NOKKUアプリのローンチを記念した特別なライブイベントです。',
                    'venue' => 'Zepp Fukuoka',
                    'event_date' => '2025-12-24 18:00:00',
                    'artist_id' => $artist->id, // 取得した管理者ID
                ]
            );

            // 7. ★ テスト券種を作成 (firstOrCreate を使用)
            TicketType::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'S席'],
                ['price' => 8000, 'capacity' => 100, 'seating_type' => 'random']
            );
            TicketType::firstOrCreate(
                ['event_id' => $event->id, 'name' => 'A席'],
                ['price' => 6000, 'capacity' => 300, 'seating_type' => 'random']
            );
            TicketType::firstOrCreate(
                ['event_id' => $event->id, 'name' => '自由席'],
                ['price' => 4000, 'capacity' => 500, 'seating_type' => 'free']
            );
        } else {
            // UserSeeder が先に実行されなかった場合など
            $this->command->warn('管理者ユーザー (admin@nokku.com) が見つからなかったため、テストイベントは作成されませんでした。');
        }
    }
}