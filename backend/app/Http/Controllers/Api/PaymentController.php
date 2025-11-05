<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product; // 商品モデル
use Stripe\Stripe; // Stripe 本体
use Stripe\PaymentIntent; // PaymentIntent クラス

class PaymentController extends Controller
{
    /**
     * PaymentIntentを作成する
     */
    public function createPaymentIntent(Request $request)
    {
        // 1. バリデーション
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
        ]);

        // 2. 商品情報をDBから取得
        $product = Product::findOrFail($validated['product_id']);

        // 3. 合計金額を計算 (Stripeは「円」などの最小通貨単位で計算)
        // 例: 5000円 * 2個 = 10000
        $amount = $product->price * $validated['quantity'];

        try {
            // 4. Laravelに設定した秘密鍵でStripeを初期化
            Stripe::setApiKey(config('services.stripe.secret'));

            // 5. Stripeに「決済ID (PaymentIntent)」の作成をリクエスト
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy', // 通貨を日本円に指定
                'automatic_payment_methods' => [
                    'enabled' => true, // カード決済などを自動で有効化
                ],
            ]);

            // 6. フロントエンド（React Native）に「client_secret」を返す
            // これが決済を実行するための鍵になります
            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $amount,
            ]);

        } catch (\Exception $e) {
            // Stripeとの通信失敗など
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}