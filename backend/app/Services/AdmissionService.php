<?php

namespace App\Services;

use App\Models\UserTicket;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdmissionService
{
    /**
     * チケットの入場処理
     * * @param string $qrCodeId
     * @return UserTicket
     * @throws \Exception
     */
    public function admitTicket(string $qrCodeId): UserTicket
    {
        return DB::transaction(function () use ($qrCodeId) {
            // 1. チケットをロックして取得
            $ticket = UserTicket::where('qr_code_id', $qrCodeId)
                ->lockForUpdate()
                ->first();

            if (!$ticket) {
                throw new \Exception('無効なQRコードです。');
            }

            // 2. ステータスチェック
            if ($ticket->status !== UserTicket::STATUS_VALID) {
                $statusLabel = $ticket->status === UserTicket::STATUS_USED ? '使用済み' : '無効';
                throw new \Exception("このチケットは{$statusLabel}です。");
            }

            // 3. 使用済みに更新
            $ticket->update([
                'status' => UserTicket::STATUS_USED,
                'used_at' => Carbon::now(),
            ]);

            return $ticket;
        });
    }

    /**
     * グッズの引換処理 (会場受取)
     * * @param string $qrCodeId
     * @return Order
     * @throws \Exception
     */
    public function redeemOrder(string $qrCodeId): Order
    {
        return DB::transaction(function () use ($qrCodeId) {
            // 1. 注文をロックして取得
            $order = Order::where('qr_code_id', $qrCodeId)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw new \Exception('注文が見つかりません。');
            }

            // 2. 引換可能かチェック
            if ($order->delivery_method !== 'venue') {
                throw new \Exception('この注文は会場受取ではありません。');
            }

            if ($order->status !== 'paid') {
                $statusLabel = $order->status === 'completed' ? '引換済み' : '未決済';
                throw new \Exception("この注文は{$statusLabel}です。");
            }

            // 3. 完了(引換済み)に更新
            $order->update(['status' => 'completed']);

            return $order;
        });
    }
}