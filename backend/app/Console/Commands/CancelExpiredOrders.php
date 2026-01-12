<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CancelExpiredOrders extends Command
{
    /**
     * コンソールで実行するコマンド名
     * 例: php artisan orders:cancel-expired
     */
    protected $signature = 'orders:cancel-expired';

    /**
     * コマンドの説明
     */
    protected $description = '作成から30分経過した未決済(pending)の注文をキャンセルし、在庫を戻す';

    /**
     * ロジック実行
     */
    public function handle()
    {
        // 1. 期限切れの時刻を計算 (現在時刻 - 30分)
        $threshold = Carbon::now()->subMinutes(30);

        // 2. 対象の注文を検索 (N+1を防ぐため items.product を eager loading)
        // status が 'pending' かつ、created_at が 30分以上前
        $expiredOrders = Order::where('status', 'pending')
            ->where('created_at', '<', $threshold)
            ->with('items.product')
            ->get();

        if ($expiredOrders->isEmpty()) {
            $this->info('期限切れの注文はありませんでした。');
            return;
        }

        $this->info("{$expiredOrders->count()} 件の期限切れ注文が見つかりました。処理を開始します...");

        foreach ($expiredOrders as $order) {
            DB::beginTransaction();
            try {
                // 3. 在庫を戻す
                foreach ($order->items as $item) {
                    if ($item->product) {
                        $item->product->increment('stock', $item->quantity);
                        $this->line("Order ID: {$order->id} - 商品: {$item->product->name} の在庫を {$item->quantity} 戻しました。");
                    }
                }

                // 4. ステータスを 'cancelled' に更新
                $order->status = 'cancelled';
                $order->save();

                DB::commit();
                Log::info("Order ID: {$order->id} を自動キャンセルしました。");
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Order ID: {$order->id} の自動キャンセルに失敗: " . $e->getMessage());
                $this->error("Order ID: {$order->id} の処理中にエラーが発生しました。");
            }
        }

        $this->info('処理完了');
        return 0;
    }
}
