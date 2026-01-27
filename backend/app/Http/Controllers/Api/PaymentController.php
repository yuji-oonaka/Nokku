<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use Illuminate\Support\Facades\Auth;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    /**
     * 【統合版】注文(Order)に対するStripe決済インテントを作成
     * チケット・グッズを問わず、一つのOrderに対して一括決済を行う。
     */
    public function createPaymentIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|integer|exists:orders,id',
        ]);

        // 1. 注文情報の取得と整合性チェック
        $order = Order::where('id', $validated['order_id'])
            ->where('user_id', Auth::id())
            ->where('status', 'pending')
            ->firstOrFail();

        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            // 2. Stripe PaymentIntent の作成
            // メタデータに order_id を含めることで、Webhook側が特定できるようにする
            $paymentIntent = PaymentIntent::create([
                'amount' => (int) $order->total_price, // Orderテーブルの合計金額を使用
                'currency' => 'jpy',
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => [
                    'order_id' => $order->id, // ★ Webhookとの紐付けに必須
                    'user_id' => Auth::id(),
                ],
            ]);

            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $order->total_price,
                'order_id' => $order->id,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => '決済の準備に失敗しました: ' . $e->getMessage()], 500);
        }
    }

    /**
     * 【重要】confirmTicketPurchase() は廃止します。
     * 理由は、決済完了後の発券処理を Webhook (StripeWebhookController) に一本化するためです。
     * これにより「支払い済みだが発券されない」不整合を物理的に排除します。
     */
}
