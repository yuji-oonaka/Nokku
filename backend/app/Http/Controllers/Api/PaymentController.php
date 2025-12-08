<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use App\Models\TicketType;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct()
    {
        // .envの STRIPE_SECRET を読み込む
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * チケット購入用のPaymentIntentを作成する
     * (サーバー側で金額計算と在庫チェックを行う)
     */
    public function createTicketPaymentIntent(Request $request)
    {
        $request->validate([
            'ticket_type_id' => 'required|exists:ticket_types,id',
            'quantity' => 'required|integer|min:1|max:10',
        ]);

        try {
            $ticketId = $request->input('ticket_type_id');
            $quantity = $request->input('quantity');
            $user = Auth::user();

            // DBから価格を取得
            $ticketType = TicketType::findOrFail($ticketId);
            
            // 在庫チェック (remainingアクセサを使用)
            if ($ticketType->remaining < $quantity) {
                return response()->json(['message' => '在庫が不足しています。'], 409);
            }

            // 合計金額計算
            $amount = $ticketType->price * $quantity;

            // Stripe PaymentIntent作成
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy',
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
                'metadata' => [
                    'type' => 'ticket',
                    'ticket_type_id' => $ticketId,
                    'quantity' => $quantity,
                    'event_id' => $ticketType->event_id,
                    'user_id' => $user ? $user->id : null,
                ],
            ]);

            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $amount,
            ]);

        } catch (\Exception $e) {
            Log::error('Stripe Payment Intent Error: ' . $e->getMessage());
            return response()->json(['message' => '決済の準備に失敗しました。'], 500);
        }
    }

    /**
     * グッズ用のPaymentIntent作成 (既存機能を維持)
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
}