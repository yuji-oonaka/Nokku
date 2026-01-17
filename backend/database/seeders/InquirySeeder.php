<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Database\Seeder;

class InquirySeeder extends Seeder
{
    public function run(): void
    {
        // 1. ユーザーを取得（DatabaseSeederで作ったもの）
        $users = User::where('role', 'user')->get();
        $artists = User::where('role', 'artist')->get();
        $mainArtist = User::where('email', 'artist@nokku.com')->first();

        if ($users->isEmpty()) {
            $this->command->warn('No users found. Skipping Inquiry seeding.');
            return;
        }

        // ==========================================
        // A. アプリへの一般的な不具合報告 (Targetなし)
        // ==========================================
        Inquiry::factory(3)->create([
            'user_id' => $users->random()->id,
            'subject' => 'ログインができない時があります',
            'target_type' => null,
            'target_id' => null,
            'organizer_id' => null,
        ]);

        // ==========================================
        // B. イベントへの問い合わせ (Target: Event)
        // ==========================================
        $events = Event::all();
        if ($events->isNotEmpty()) {
            foreach ($events->random(min(3, $events->count())) as $event) {
                // 主催者宛の問い合わせ
                Inquiry::factory()->create([
                    'user_id' => $users->random()->id,
                    'target_type' => Event::class,
                    'target_id' => $event->id,
                    'organizer_id' => $event->artist_id, // イベント主催者
                    'subject' => '車椅子席の予約について',
                    'status' => 'open',
                ]);
            }
        }

        // ==========================================
        // C. エスカレーション案件 (Target: Event, Escalated)
        // ==========================================
        if ($mainArtist) {
            $mainEvent = Event::where('artist_id', $mainArtist->id)->first();
            if ($mainEvent) {
                Inquiry::factory()->escalated()->create([
                    'user_id' => $users->random()->id,
                    'target_type' => Event::class,
                    'target_id' => $mainEvent->id,
                    'organizer_id' => $mainArtist->id,
                    'subject' => '公演中止なのに返金されません',
                ]);
            }
        }

        // ==========================================
        // D. 解決済みの問い合わせ
        // ==========================================
        Inquiry::factory(2)->closed()->create([
            'user_id' => $users->random()->id,
            'target_type' => null,
            'subject' => '解決済みのバグ報告',
        ]);
    }
}
