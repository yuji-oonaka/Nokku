<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\CancelExpiredOrders;
use App\Console\Commands\CleanupExpiredInquiries;
// ▼ 追加: ポイント操作用
use App\Services\PointService;
use App\Models\PointTransaction;

// デフォルトのサンプルコマンド
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// ==========================================
// 🛠️ 開発者用ツール: ポイント付与コマンド
// ==========================================
// 使い方: php artisan point:give {ユーザーID} {ポイント数}
// 例: php artisan point:give 1 5000  (ID:1 に 5000pt 付与)
// 例: php artisan point:give 2 -100  (ID:2 から 100pt 没収)
Artisan::command('point:give {userId} {amount}', function (PointService $service) {
    $userId = $this->argument('userId');
    $amount = (int) $this->argument('amount');

    // ユーザー存在チェックなどはServiceにお任せ
    try {
        // マイナスの値を渡せば「没収」も可能
        // 付与なのでマイナスの値を反転させる必要はなく、amountが正なら増えるロジック前提
        // ※PointService::consumePointsは「減らす」メソッドなので、
        //  増やすときは「負の数」を渡す必要があります (-(-1000) = +1000)

        $consumeAmount = -$amount;

        $service->consumePoints(
            $userId,
            $consumeAmount,
            PointTransaction::TYPE_BONUS, // 'bonus' として記録
            "管理用コマンドによる操作",
            ['admin_operation' => true]
        );

        $this->info("✅ User ID: {$userId} / 変動: {$amount}pt / 処理完了");
    } catch (\Exception $e) {
        $this->error("❌ エラー: " . $e->getMessage());
    }
});


// ==========================================
// 📅 定期実行バッチ (Scheduler)
// ==========================================

// 在庫戻しバッチ (5分ごと)
Schedule::command(CancelExpiredOrders::class)
    ->everyFiveMinutes()
    ->withoutOverlapping();

// 期限切れお問い合わせ削除バッチ (毎日0時)
Schedule::command(CleanupExpiredInquiries::class)
    ->dailyAt('00:00');
