<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\CancelExpiredOrders;
use App\Console\Commands\CleanupExpiredInquiries; // ★追加

// デフォルトのサンプルコマンド（そのままでOK）
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// 在庫戻しバッチのスケジュール登録
// 5分ごとに実行し、多重起動（前の処理が終わる前に次が動くこと）を防ぐ
Schedule::command(CancelExpiredOrders::class)
    ->everyFiveMinutes()
    ->withoutOverlapping();

// ★ 追加: 期限切れお問い合わせの削除バッチ
// 毎日深夜0時に実行
Schedule::command(CleanupExpiredInquiries::class)
    ->dailyAt('00:00');
