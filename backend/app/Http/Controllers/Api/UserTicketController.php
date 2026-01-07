<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // ★ Transaction用に必須
use Illuminate\Support\Facades\Log;
use App\Models\UserTicket;
use App\Models\Order;
use Kreait\Laravel\Firebase\Facades\Firebase;

class UserTicketController extends Controller
{
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $myTickets = $user->userTickets()
            ->with(['event', 'ticketType'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($myTickets);
    }

    public function scanTicket(Request $request)
    {
        $validated = $request->validate([
            'qr_code_id' => 'required|string',
        ]);

        $qrCodeId = $validated['qr_code_id'];
        $scannerUser = Auth::user();

        // 1. スキャン実行者の基本権限チェック (Admin or Artist)
        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        // 2. トランザクション開始（ここからコミットまでデータがロックされる）
        // ※ 外部API (Firestore) はトランザクション外または影響しないように配置
        try {
            $result = DB::transaction(function () use ($qrCodeId, $scannerUser) {

                // ★ 悲観的ロック (Pessimistic Locking)
                // この行が実行されている間、他のリクエストはこの行を読み込めず待機状態になる
                $ticket = UserTicket::where('qr_code_id', $qrCodeId)
                    ->lockForUpdate()
                    ->with('event')
                    ->first();

                // 3. チケットが存在しない場合の処理
                if (!$ticket) {
                    // グッズ引換QRかどうかの判定 (ここはロック不要)
                    $isOrder = Order::where('qr_code_id', $qrCodeId)->exists();
                    if ($isOrder) {
                        throw new \Exception('これはグッズ引換用のQRコードです。「グッズ引換」モードに切り替えてください。', 400);
                    }
                    throw new \Exception('チケットが見つかりません', 404);
                }

                // 4. イベント主催者権限チェック
                if ($scannerUser->role !== 'admin') {
                    $eventOwnerId = $ticket->event->artist_id;
                    if ($eventOwnerId !== $scannerUser->id) {
                        throw new \Exception('権限がありません。他者のイベントのチケットは操作できません。', 403);
                    }
                }

                // 5. 使用済みチェック (ロック中なので確実に判定可能)
                if ($ticket->is_used) {
                    // フロントエンドで詳細を表示するためにチケット情報を例外に乗せる等の工夫も可だが、
                    // ここではシンプルにステータスコードで返すために例外を投げる
                    // ※ load() はトランザクション内でも有効
                    $ticket->load('event', 'ticketType');
                    return ['status' => 409, 'message' => 'このチケットは既に使用済みです。', 'ticket' => $ticket];
                }

                // 6. 更新処理
                $ticket->is_used = true;
                $ticket->used_at = now();
                $ticket->save();

                return ['status' => 200, 'message' => "認証成功！\n{$ticket->event->title} / {$ticket->seat_number}", 'ticket' => $ticket];
            });

            // トランザクションが正常終了した場合の戻り値を判定
            if ($result['status'] === 409) {
                return response()->json([
                    'message' => $result['message'],
                    'ticket' => $result['ticket']
                ], 409);
            }

            $ticket = $result['ticket']; // 更新後のチケット

            // 7. Firestore通知 (トランザクション確定後に実行)
            // ここが失敗してもMySQL側はロールバックしない（入場事実は確定させる）
            $this->syncToFirestore($ticket, $scannerUser);

            return response()->json([
                'message' => $result['message'],
                'ticket' => $ticket->load('event', 'ticketType')
            ], 200);
        } catch (\Exception $e) {
            // トランザクション内のカスタム例外(400, 404, 403)を処理
            $code = $e->getCode();
            $status = ($code && $code >= 400 && $code < 600) ? $code : 500;

            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    /**
     * Firestoreへの同期処理を分離
     */
    private function syncToFirestore($ticket, $scannerUser)
    {
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
                ]);
        } catch (\Exception $e) {
            Log::error('Firestore write failed: ' . $e->getMessage());
            // クライアントにはエラーを返さない
        }
    }
}
