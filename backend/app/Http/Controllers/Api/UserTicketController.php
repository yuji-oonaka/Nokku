<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\UserTicket;
// ★追加: 相互チェックのために Order, OrderItem モデルを使えるようにする
use App\Models\Order;
use App\Models\OrderItem;
use Kreait\Firebase\Contract\Firestore;
use Illuminate\Support\Facades\Log;

class UserTicketController extends Controller
{
    protected $firestore;

    public function __construct(Firestore $firestore)
    {
        $this->firestore = $firestore;
    }

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
     * QRコードをスキャンしてチケットを使用済みにする
     */
    public function scanTicket(Request $request)
    {
        $validated = $request->validate([
            'qr_code_id' => 'required|string', // existsチェックは自前でやるので外すか、このままでも良いがメッセージ制御のため外した方が柔軟
        ]);

        $qrCodeId = $validated['qr_code_id'];
        $scannerUser = Auth::user();

        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        // 4. チケットの検索
        // ★修正: firstOrFail ではなく first にして、見つからない場合の分岐を作る
        $ticket = UserTicket::where('qr_code_id', $qrCodeId)
            ->with('event')
            ->first();

        if (!$ticket) {
            // ★★★ 親切設計: もしチケットでなければ、グッズ（注文）かどうか確認する ★★★
            $isOrder = Order::where('qr_code_id', $qrCodeId)->exists()
                || OrderItem::where('id', $qrCodeId)->exists();

            if ($isOrder) {
                return response()->json([
                    'message' => 'これはグッズ引換用のQRコードです。「グッズ引換」モードに切り替えてください。'
                ], 400); // 400 Bad Request
            }

            return response()->json(['message' => 'チケットが見つかりません'], 404);
        }

        // セキュリティ権限チェック
        if ($scannerUser->role !== 'admin') {
            $eventOwnerId = $ticket->event->artist_id;
            if ($eventOwnerId !== $scannerUser->id) {
                return response()->json([
                    'message' => '権限がありません。他者のイベントのチケットは操作できません。'
                ], 403);
            }
        }

        // 使用済みチェック
        if ($ticket->is_used) {
            return response()->json([
                'message' => 'このチケットは既に使用済みです。',
                'ticket' => $ticket->load('event', 'ticketType')
            ], 409);
        }

        // 更新処理
        $ticket->is_used = true;
        $ticket->used_at = now();
        $ticket->save();

        // Firestore通知
        try {
            $docRef = $this->firestore->database()
                ->collection('ticket_status')
                ->document($ticket->qr_code_id);

            $docRef->set([
                'status' => 'used',
                'is_used' => true,
                'scanned_at' => new \DateTime(),
                'scanner_id' => $scannerUser->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Firestore write failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'チケットを正常に使用済みにしました。',
            'ticket' => $ticket->load('event', 'ticketType')
        ], 200);
    }
}
