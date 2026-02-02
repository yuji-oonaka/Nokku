<?php

namespace App\Services;

use App\Models\UserTicket;
use App\Models\User;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Exception;

class TicketAdmissionService
{
    /**
     * チケット入場処理
     */
    public function processAdmission(User $scannerUser, $identifier, string $type = 'qr'): array
    {
        if (!in_array($scannerUser->role, ['admin', 'artist', 'staff'])) {
            throw new Exception('権限がありません。', 403);
        }

        $ticket = DB::transaction(function () use ($scannerUser, $identifier, $type) {
            $query = UserTicket::with(['event', 'ticketType'])->lockForUpdate();
            $type === 'qr' ? $query->where('qr_code_id', $identifier) : $query->where('id', $identifier);
            $ticket = $query->first();

            if (!$ticket) {
                if ($type === 'qr' && Order::where('qr_code_id', $identifier)->exists()) {
                    throw new Exception('これはグッズ引換用QRです。「グッズ引換」モードにしてください。', 400);
                }
                throw new Exception('チケットが見つかりません', 404);
            }

            // アーティスト・スタッフの所属チェック
            if ($scannerUser->role !== 'admin') {
                $ownerId = ($scannerUser->role === 'staff') ? $scannerUser->employer_id : $scannerUser->id;
                if ($ticket->event->artist_id !== $ownerId) {
                    throw new Exception('担当外のイベントチケットです。', 403);
                }
            }

            if ($ticket->status === UserTicket::STATUS_USED) {
                throw new Exception('このチケットは既に使用済みです。', 409);
            }

            $ticket->update(['status' => UserTicket::STATUS_USED, 'used_at' => now()]);
            return $ticket;
        });

        $this->syncToFirestore($ticket->qr_code_id, UserTicket::STATUS_USED, $ticket->user_id, $ticket->seat_number, $scannerUser->id);

        return [
            'message' => "認証成功！\n{$ticket->seat_number}",
            'ticket'  => $ticket
        ];
    }

    /**
     * グッズ引換処理 (Order用)
     */
    public function processOrderRedemption(User $scannerUser, string $qrCodeId): array
    {
        // 1. 基本権限チェック
        if (!in_array($scannerUser->role, ['admin', 'artist', 'staff'])) {
            throw new Exception('権限がありません。', 403);
        }

        // 2. 注文をロックして取得。まず存在確認を行う（磨きポイント②）
        $order = Order::with('items.product')->where('qr_code_id', $qrCodeId)->lockForUpdate()->first();
        if (!$order) throw new Exception('注文が見つかりません。', 404);

        // 3. 権限チェック（アーティスト/スタッフの一致） 
        if ($scannerUser->role !== 'admin') {
            $ownerId = ($scannerUser->role === 'staff') ? $scannerUser->employer_id : $scannerUser->id;
            $isUnauthorized = $order->items->contains(fn($item) => $item->product && $item->product->artist_id !== $ownerId);
            if ($isUnauthorized) throw new Exception('担当外の商品の注文です。', 403);
        }

        // 4. ステータスチェック
        if ($order->status === 'completed') throw new Exception('この注文は既に引換済みです。', 409);

        // 現金払いの「未決済（pending）」は許容し、それ以外の未決済はエラーにする 
        $isCashPending = ($order->payment_method === 'cash' && $order->status === 'pending');
        if (!$isCashPending && $order->status !== 'paid') {
            throw new Exception('未決済の注文です。', 400);
        }

        // 5. サマリー生成
        $order->load(['items', 'user']);
        $userName = $order->user->nickname ?? 'ゲスト';
        $itemsSummary = $order->items->map(fn($i) => "・{$i->product_name} × {$i->quantity}")->implode("\n");
        $priceText = "合計: ¥" . number_format($order->total_price);
        $fullSummary = "【{$userName} 様】\n{$itemsSummary}\n{$priceText}";

        // 6. ステータスに応じた分岐
        if ($order->status === 'paid') {
            // カード決済済みの場合は即座に完了 
            $order->update(['status' => 'completed', 'completed_at' => now()]);
            $this->syncToFirestore($order->qr_code_id, 'completed', $order->user_id, $fullSummary, $scannerUser->id, 'order_status');

            return [
                'message' => "引き換え完了！",
                'summary' => $fullSummary,
                'requires_payment' => false
            ];
        }

        // 現金払いの場合は、フロントに「requires_payment」フラグを返して一旦止める
        return [
            'message' => "【現金払い】代金を受領してください",
            'summary' => $fullSummary,
            'requires_payment' => true
        ];
    }

    /**
     * 現金払いの確定処理（監査ログ対応版）
     */
    public function confirmCashPayment(User $scannerUser, string $qrCodeId): array
    {
        return DB::transaction(function () use ($qrCodeId, $scannerUser) {
            $order = Order::with('items.product')->where('qr_code_id', $qrCodeId)->lockForUpdate()->first();

            if (!$order) throw new Exception('注文が見つかりません', 404);

            // 権限チェックを再実施（不正防止）
            if ($scannerUser->role !== 'admin') {
                $ownerId = ($scannerUser->role === 'staff') ? $scannerUser->employer_id : $scannerUser->id;
                $isUnauthorized = $order->items->contains(fn($item) => $item->product && $item->product->artist_id !== $ownerId);
                if ($isUnauthorized) throw new Exception('確定権限がありません。', 403);
            }

            if ($order->payment_method !== 'cash' || $order->status !== 'pending') {
                throw new Exception('無効な注文状態です。', 400);
            }

            // ステータス更新と監査ログ（cash_confirmed_by）の記録
            $order->update([
                'status' => 'completed',
                'completed_at' => now(),
                'cash_confirmed_by' => $scannerUser->id, // 誰が確定したかを墓標として刻む
            ]);

            $this->syncToFirestore($order->qr_code_id, 'completed', $order->user_id, "【現金決済完了】\n担当: {$scannerUser->nickname}", $scannerUser->id, 'order_status');

            return ['message' => '支払い・引換を完了しました'];
        });
    }
    
    /**
     * Firestore同期 (共通)
     */
    public function syncToFirestore($qrCodeId, $status, $userId, $seatNumber, $scannerId = null, $collection = 'ticket_status'): void
    {
        try {
            $owner = User::find($userId);
            if (!$owner || !$owner->firebase_uid) {
                Log::warning("Firestore Sync: Owner or Firebase UID not found for user {$userId}");
                return;
            }

            $data = [
                'status'      => $status,
                'owner_uid'   => $owner->firebase_uid,
                'updated_at'  => new \DateTime(),
                'seat_number' => $seatNumber,
            ];

            // スキャン時のみスキャナーIDをセット
            if ($scannerId) {
                $data['scanner_id'] = $scannerId;
            }

            Firebase::firestore()->database()->collection($collection)
                ->document($qrCodeId)->set($data, ['merge' => true]);
        } catch (\Exception $e) {
            Log::error("Firestore Sync Failed ($collection): " . $e->getMessage());
        }
    }
}
