<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\UserTicket;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
// ★ 追加: Firebase Facade
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

        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        // チケット検索
        $ticket = UserTicket::where('qr_code_id', $qrCodeId)
            ->with('event')
            ->first();

        if (!$ticket) {
            // グッズかどうか確認
            $isOrder = Order::where('qr_code_id', $qrCodeId)->exists();
            if ($isOrder) {
                return response()->json([
                    'message' => 'これはグッズ引換用のQRコードです。「グッズ引換」モードに切り替えてください。'
                ], 400);
            }
            return response()->json(['message' => 'チケットが見つかりません'], 404);
        }

        // 権限チェック
        if ($scannerUser->role !== 'admin') {
            $eventOwnerId = $ticket->event->artist_id;
            if ($eventOwnerId !== $scannerUser->id) {
                return response()->json([
                    'message' => '権限がありません。他者のイベントのチケットは操作できません。'
                ], 403);
            }
        }

        if ($ticket->is_used) {
            return response()->json([
                'message' => 'このチケットは既に使用済みです。',
                'ticket' => $ticket->load('event', 'ticketType')
            ], 409);
        }

        // ★ 更新処理 (MySQL)
        $ticket->is_used = true;
        $ticket->used_at = now();
        $ticket->save();

        // ★ Firestore通知 (エラーが出ても無視してレスポンスを返す)
        try {
            $firestore = Firebase::firestore(); // Facadeを使用
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
            // ログだけ残して、処理は続行（クライアントには成功を返す）
            Log::error('Firestore write failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => "認証成功！\n{$ticket->event->title} / {$ticket->seat_number}",
            'ticket' => $ticket->load('event', 'ticketType')
        ], 200);
    }
}
