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
     * チケットの入場処理を行う
     *
     * @param User $scannerUser スキャン実行者
     * @param string|int $identifier 検索キー (qr_code_id または id)
     * @param string $type 検索タイプ ('qr' または 'manual')
     * @return array 結果データ
     * @throws Exception
     */
    public function processAdmission(User $scannerUser, $identifier, string $type = 'qr'): array
    {
        // 1. 権限チェック
        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
            throw new Exception('権限がありません。', 403);
        }

        // トランザクション処理
        $ticket = DB::transaction(function () use ($scannerUser, $identifier, $type) {

            // 2. チケット検索 & ロック
            $query = UserTicket::with('event', 'ticketType')->lockForUpdate();

            if ($type === 'qr') {
                $query->where('qr_code_id', $identifier);
            } else {
                $query->where('id', $identifier);
            }

            $ticket = $query->first();

            // 3. 存在チェック
            if (!$ticket) {
                // QRの場合、グッズ引換券と間違えてないかチェック
                if ($type === 'qr') {
                    $isOrder = Order::where('qr_code_id', $identifier)->exists();
                    if ($isOrder) {
                        throw new Exception('これはグッズ引換用のQRコードです。「グッズ引換」モードに切り替えてください。', 400);
                    }
                }
                throw new Exception('チケットが見つかりません', 404);
            }

            // 4. イベント所有権チェック
            if ($scannerUser->role !== 'admin') {
                // $ticket->event が null の可能性も考慮すべきだが、外部キー制約があればOK
                if ($ticket->event->artist_id !== $scannerUser->id) {
                    throw new Exception('権限がありません。他者のイベントのチケットは操作できません。', 403);
                }
            }

            // 5. 使用済みチェック
            if ($ticket->is_used) {
                // 例外コード 409 (Conflict) を使用
                throw new Exception('このチケットは既に使用済みです。', 409);
            }

            // 6. 更新実行
            $ticket->is_used = true;
            $ticket->used_at = now();
            $ticket->save();

            return $ticket;
        });

        // 7. Firestore同期 (トランザクション成功後)
        $this->syncToFirestore($ticket, $scannerUser);

        return [
            'message' => "認証成功！\n{$ticket->event->title} / {$ticket->seat_number}",
            'ticket'  => $ticket
        ];
    }

    /**
     * Firestoreへの同期
     */
    private function syncToFirestore(UserTicket $ticket, User $scannerUser): void
    {
        if (!$ticket->qr_code_id) return;

        try {
            $firestore = Firebase::firestore();
            $database = $firestore->database();

            $database->collection('ticket_status')
                ->document($ticket->qr_code_id)
                ->set([
                    'status' => 'used',
                    'is_used' => true,
                    'scanned_at' => new \DateTime(),
                    'scanner_id' => $scannerUser->id,
                    'ticket_id' => $ticket->id,
                ]);
        } catch (\Exception $e) {
            Log::error('Firestore write failed: ' . $e->getMessage());
            // FirestoreのエラーでHTTPレスポンスを止めないよう、例外は握りつぶす
        }
    }
}
