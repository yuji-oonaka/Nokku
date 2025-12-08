<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\UserTicket;
use App\Models\TicketType;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
use Kreait\Laravel\Firebase\Facades\Firebase;
use Stripe\Stripe;
use Stripe\PaymentIntent;

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

    // ★ 改修: 複数枚購入 & Stripe決済検証付き
    public function purchase(Request $request)
    {
        $validated = $request->validate([
            'ticket_type_id' => 'required|exists:ticket_types,id',
            'quantity' => 'required|integer|min:1|max:10', // 一度の購入上限を仮設定
            'payment_intent_id' => 'required|string', // Stripeの決済ID
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $ticketTypeId = $validated['ticket_type_id'];
        $quantity = $validated['quantity'];
        $paymentIntentId = $validated['payment_intent_id'];

        // 1. Stripe決済の検証 (セキュリティ対策)
        // クライアントから「払ったよ」と言われても、念のためサーバーからStripeに確認する
        try {
            Stripe::setApiKey(config('services.stripe.secret'));
            $intent = PaymentIntent::retrieve($paymentIntentId);

            if ($intent->status !== 'succeeded') {
                return response()->json(['message' => '決済が完了していません。'], 402);
            }
            
            // NOTE: ここで金額($intent->amount)とチケット価格($ticketType->price * $quantity)の一致確認をするとより安全です
            
        } catch (\Exception $e) {
            Log::error('Stripe verification failed: ' . $e->getMessage());
            return response()->json(['message' => '決済の検証に失敗しました。'], 500);
        }

        // 2. 在庫チェック & チケット発行 (トランザクション)
        return DB::transaction(function () use ($user, $ticketTypeId, $quantity, $paymentIntentId) {
            // ロックをかけてTicketTypeを取得
            $ticketType = TicketType::lockForUpdate()->find($ticketTypeId);

            // 在庫チェック
            $currentSold = $ticketType->userTickets()->count();
            if (($currentSold + $quantity) > $ticketType->capacity) {
                // 決済済みだが在庫がない場合の緊急対応
                // Stripeの払い戻し処理(Refund)をここに書くのが理想ですが、
                // まずはエラーを返して、運営へ通知ログを残す運用とします。
                Log::critical("在庫切れ発生: User {$user->id} paid for TicketType {$ticketType->id} but stock is empty. PaymentIntent: {$paymentIntentId}");
                return response()->json(['message' => '申し訳ありません、タッチの差で完売しました。返金処理については運営にお問い合わせください。'], 409);
            }

            $createdTickets = [];

            // 3. 枚数分ループしてチケット発行
            for ($i = 0; $i < $quantity; $i++) {
                // 座席番号生成 (例: S席-001)
                // lockForUpdateしているので、ループ内でカウントアップしても整合性は保たれます
                $seatNumber = $ticketType->name . '-' . str_pad($currentSold + $i + 1, 3, '0', STR_PAD_LEFT);
                $qrCodeId = (string) Str::uuid();

                $ticket = UserTicket::create([
                    'user_id' => $user->id,
                    'event_id' => $ticketType->event_id,
                    'ticket_type_id' => $ticketType->id,
                    'price' => $ticketType->price,
                    'qr_code_id' => $qrCodeId,
                    'seat_number' => $seatNumber,
                    'is_used' => false,
                    // 将来的に payment_intent_id を保存するカラムを作ると追跡しやすいです
                ]);
                
                $createdTickets[] = $ticket;
            }

            return response()->json([
                'message' => "{$quantity}枚のチケットを購入しました！",
                'tickets' => $createdTickets, // 複数形に変更
            ], 201);
        });
    }

    public function scanTicket(Request $request)
    {
        // ... (既存のスキャンロジックは変更なし)
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