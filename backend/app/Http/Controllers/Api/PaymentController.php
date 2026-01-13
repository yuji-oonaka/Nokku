<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\TicketType;
use App\Models\UserTicket;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use App\Http\Requests\Payment\CreateTicketPaymentRequest;
use App\Http\Requests\Payment\ConfirmTicketPurchaseRequest;
use App\Services\TicketService; // ★ 追加

class PaymentController extends Controller
{
    // ★ Serviceをコンストラクタ注入、またはメソッド注入で利用可能にする
    // 今回はメソッド注入を使います。

    /**
     * グッズのPaymentIntentを作成 (維持)
     */
    public function createPaymentIntent(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $amount = $product->price * $validated['quantity'];

        try {
            Stripe::setApiKey(config('services.stripe.secret'));
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy',
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => [
                    'type' => 'product',
                    'product_id' => $product->id,
                    'quantity' => $validated['quantity'],
                    'user_id' => Auth::id(),
                ],
            ]);

            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $amount,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * チケットのPaymentIntentを作成 (維持)
     */
    public function createTicketPaymentIntent(CreateTicketPaymentRequest $request)
    {
        $validated = $request->validated();
        $ticket = TicketType::findOrFail($validated['ticket_id']);
        $amount = $ticket->price * $validated['quantity'];

        try {
            Stripe::setApiKey(config('services.stripe.secret'));
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy',
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => [
                    'type' => 'ticket',
                    'ticket_type_id' => $ticket->id,
                    'quantity' => $validated['quantity'],
                    'event_id' => $ticket->event_id,
                    'user_id' => Auth::id(),
                ]
            ]);

            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $amount,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => '決済の準備に失敗しました: ' . $e->getMessage()], 500);
        }
    }

    /**
     * チケット購入を確定し、UserTicketを作成する (★ Service利用へ変更)
     */
    public function confirmTicketPurchase(ConfirmTicketPurchaseRequest $request, TicketService $ticketService)
    {
        // 1. バリデーション
        $validated = $request->validated();

        // 2. 二重作成チェック (ここはControllerの責務: HTTPリクエストの制御)
        $existingTickets = UserTicket::where('stripe_payment_id', $validated['stripe_payment_id'])->get();
        if ($existingTickets->isNotEmpty()) {
            return response()->json([
                'message' => 'チケットは既に作成されています',
                'tickets' => $existingTickets
            ], 200);
        }

        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            // 3. Service層でビジネスロジック実行 (トランザクション・在庫処理など)
            $createdUserTickets = $ticketService->purchaseTickets(
                $user,
                $validated['ticket_type_id'],
                $validated['quantity'],
                $validated['stripe_payment_id']
            );

            return response()->json([
                'message' => 'チケットの購入が完了しました！',
                'tickets' => $createdUserTickets
            ], 201);
        } catch (\Exception $e) {
            // Serviceから投げられたエラー(売り切れ等)をキャッチしてレスポンス
            // エラーログを残すなら Log::error($e); をここに入れる
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
