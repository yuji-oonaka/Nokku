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
        if (!in_array($scannerUser->role, ['admin', 'artist', 'staff'])) {
            throw new Exception('権限がありません。', 403);
        }

        $order = DB::transaction(function () use ($qrCodeId, $scannerUser) {
            $order = Order::where('qr_code_id', $qrCodeId)->lockForUpdate()->first();

            if (!$order) throw new Exception('注文が見つかりません。', 404);
            if ($order->status === 'completed') throw new Exception('この注文は既に引換済みです。', 409);
            if ($order->status !== 'paid') throw new Exception('未決済の注文です。', 400);

            $order->update(['status' => 'completed', 'completed_at' => now()]);
            return $order;
        });

        $this->syncToFirestore($order->qr_code_id, 'completed', $order->user_id, 'グッズ引換', $scannerUser->id, 'order_status');

        return [
            'message' => "引き換え完了！",
            'order'   => $order->load('items')
        ];
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
