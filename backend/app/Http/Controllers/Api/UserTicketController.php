<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

    /**
     * QRコードによるスキャン入場
     */
    public function scanTicket(Request $request)
    {
        $validated = $request->validate([
            'qr_code_id' => 'required|string',
        ]);

        // 共通ロジック呼び出し
        return $this->handleAdmission(function () use ($validated) {
            // QRコードで検索 & ロック
            return UserTicket::where('qr_code_id', $validated['qr_code_id'])
                ->lockForUpdate()
                ->with('event')
                ->first();
        }, $validated['qr_code_id']); // エラー判定用にQRコードを渡す
    }

    /**
     * ★ 追加: ID手入力による入場
     */
    public function enterManually(Request $request)
    {
        $validated = $request->validate([
            'ticket_id' => 'required|integer',
        ]);

        // 共通ロジック呼び出し
        return $this->handleAdmission(function () use ($validated) {
            // IDで検索 & ロック
            return UserTicket::where('id', $validated['ticket_id'])
                ->lockForUpdate()
                ->with('event')
                ->first();
        });
    }

    /**
     * 共通入場処理ロジック (DRY原則)
     * @param callable $ticketRetrieval ロック付きでチケットを取得する関数
     * @param string|null $qrCodeIdForError QRスキャン時のエラー判定用ID
     */
    private function handleAdmission(callable $ticketRetrieval, $qrCodeIdForError = null)
    {
        $scannerUser = Auth::user();

        // 1. 権限チェック
        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        try {
            $result = DB::transaction(function () use ($ticketRetrieval, $scannerUser, $qrCodeIdForError) {

                // チケット取得 (悲観的ロック適用)
                $ticket = $ticketRetrieval();

                // 2. 存在チェック
                if (!$ticket) {
                    // QRスキャンの場合のみ、グッズ引換券チェックを行う
                    if ($qrCodeIdForError) {
                        $isOrder = Order::where('qr_code_id', $qrCodeIdForError)->exists();
                        if ($isOrder) {
                            throw new \Exception('これはグッズ引換用のQRコードです。「グッズ引換」モードに切り替えてください。', 400);
                        }
                    }
                    throw new \Exception('チケットが見つかりません', 404);
                }

                // 3. イベント主催者権限チェック
                if ($scannerUser->role !== 'admin') {
                    $eventOwnerId = $ticket->event->artist_id;
                    if ($eventOwnerId !== $scannerUser->id) {
                        throw new \Exception('権限がありません。他者のイベントのチケットは操作できません。', 403);
                    }
                }

                // 4. 使用済みチェック
                if ($ticket->is_used) {
                    $ticket->load('event', 'ticketType');
                    return ['status' => 409, 'message' => 'このチケットは既に使用済みです。', 'ticket' => $ticket];
                }

                // 5. 更新処理
                $ticket->is_used = true;
                $ticket->used_at = now();
                $ticket->save();

                return ['status' => 200, 'message' => "認証成功！\n{$ticket->event->title} / {$ticket->seat_number}", 'ticket' => $ticket];
            });

            // トランザクション結果の判定
            if ($result['status'] === 409) {
                return response()->json([
                    'message' => $result['message'],
                    'ticket' => $result['ticket']
                ], 409);
            }

            $ticket = $result['ticket'];

            // 6. Firestore通知 (トランザクション確定後に実行)
            $this->syncToFirestore($ticket, $scannerUser);

            return response()->json([
                'message' => $result['message'],
                'ticket' => $ticket->load('event', 'ticketType')
            ], 200);
        } catch (\Exception $e) {
            $code = $e->getCode();
            $status = ($code && $code >= 400 && $code < 600) ? $code : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    /**
     * Firestoreへの同期処理
     */
    private function syncToFirestore($ticket, $scannerUser)
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
        }
    }
}
