<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\CancelExpiredOrders;

// デフォルトのサンプルコマンド（そのままでOK）
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// ★ 追加: 在庫戻しバッチのスケジュール登録
// 5分ごとに実行し、多重起動（前の処理が終わる前に次が動くこと）を防ぐ
Schedule::command(CancelExpiredOrders::class)
    ->everyFiveMinutes()
    ->withoutOverlapping();
