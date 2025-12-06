<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\UserTicket;
use App\Models\TicketType; // 追加
use App\Models\Order;
use Illuminate\Support\Facades\Log;
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

    // ★ 新規追加: チケット購入API
    public function purchase(Request $request)
    {
        $validated = $request->validate([
            'ticket_type_id' => 'required|exists:ticket_types,id',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $ticketTypeId = $validated['ticket_type_id'];

        // トランザクション開始（在庫整合性のため）
        return DB::transaction(function () use ($user, $ticketTypeId) {
            // ロックをかけてTicketTypeを取得（同時購入対策）
            $ticketType = TicketType::lockForUpdate()->find($ticketTypeId);

            // 1. イベント終了チェック
            // (簡易的にTicketTypeからEventを取得して日付など見るべきですが、一旦省略)

            // 2. 在庫チェック
            $soldCount = $ticketType->userTickets()->count();
            if ($soldCount >= $ticketType->capacity) {
                return response()->json(['message' => '申し訳ありません、このチケットは完売しました。'], 409);
            }

            // 3. 座席番号/整理番号の生成
            // 例: "S席-001"
            $seatNumber = $ticketType->name . '-' . str_pad($soldCount + 1, 3, '0', STR_PAD_LEFT);

            // 4. チケット発行 (UserTicket作成)
            $ticket = UserTicket::create([
                'user_id' => $user->id,
                'event_id' => $ticketType->event_id,
                'ticket_type_id' => $ticketType->id,
                'price' => $ticketType->price,
                'qr_code_id' => (string) Str::uuid(), // ユニークなQRコードID
                'seat_number' => $seatNumber,
                'is_used' => false,
            ]);

            // TODO: ここでStripe決済を入れる場合は、決済成功後にこの処理を行うか、
            // PaymentIntentのmetadataにticket情報を入れてWebhookで作成するなどの対応が必要。
            // 今回は「購入API」としてDB保存を優先実装。

            return response()->json([
                'message' => 'チケットを購入しました！',
                'ticket' => $ticket->load(['event', 'ticketType']),
            ], 201);
        });
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
        }

        return response()->json([
            'message' => "認証成功！\n{$ticket->event->title} / {$ticket->seat_number}",
            'ticket' => $ticket->load('event', 'ticketType')
        ], 200);
    }
}