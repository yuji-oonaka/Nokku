<?php
// ファイル名: app/Http/Controllers/Api/OrderController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order; // 1. ★ 必要なモデルを use
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // 2. ★ DBトランザクション用に use
use Illuminate\Validation\Rule; // 3. ★ バリデーション用に use
use Stripe\Stripe; // 4. ★ Stripe を use
use Stripe\PaymentIntent;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * ログイン中のユーザーの注文履歴を取得 (index)
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 1. ユーザーの注文を、関連する「明細(items)」も一緒に取得
        //    (N+1問題を避けるため 'with' を使います)
        $orders = Order::where('user_id', $user->id)
            ->with('items') // ★ リレーション ('items') を事前読み込み
            ->orderBy('created_at', 'desc') // ★ 新しい順
            ->get();

        // 2. 注文履歴を JSON で返す
        return response()->json($orders);
    }

    public function store(Request $request)
    {
        // 5. ★ バリデーション
        $validatedData = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'payment_method' => ['required', 'string', Rule::in(['stripe', 'cash'])],
            'delivery_method' => ['required', 'string', Rule::in(['mail', 'venue'])],
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $product = Product::find($validatedData['product_id']);
        $quantity = $validatedData['quantity'];
        $paymentMethod = $validatedData['payment_method'];
        $deliveryMethod = $validatedData['delivery_method'];

        // 6. ★ 在庫チェック
        if ($product->stock < $quantity) {
            return response()->json(['message' => '在庫が不足しています'], 422); // 422 Unprocessable Entity
        }

        // 7. ★ 合計金額の計算 (Stripeはセント単位なので * 100 します)
        $totalPrice = $product->price * $quantity;
        $totalPriceInCents = $totalPrice * 100; // Stripe用

        // 8. ★ 配送先住所の準備
        $shippingAddress = null;
        if ($deliveryMethod === 'mail') {
            // 郵送の場合、ユーザーの住所が登録されているかチェック
            if (empty($user->postal_code) || empty($user->prefecture) || empty($user->city) || empty($user->address_line1)) {
                return response()->json(['message' => '配送先住所が登録されていません。プロフィールから登録してください。'], 422);
            }
            // 注文「時点」の住所をコピーして保存
            $shippingAddress = [
                'name' => $user->real_name,
                'phone' => $user->phone_number,
                'postal_code' => $user->postal_code,
                'prefecture' => $user->prefecture,
                'city' => $user->city,
                'address_line1' => $user->address_line1,
                'address_line2' => $user->address_line2,
            ];
        }

        // 9. ★ 決済処理の準備
        $clientSecret = null;
        $stripePaymentIntentId = null;

        if ($paymentMethod === 'stripe') {
            // Stripe決済の場合、PaymentIntentを作成
            try {
                $paymentIntent = $this->createStripePaymentIntent($totalPriceInCents, $user);
                $clientSecret = $paymentIntent->client_secret;
                $stripePaymentIntentId = $paymentIntent->id;
            } catch (\Exception $e) {
                return response()->json(['message' => '決済の準備に失敗しました: ' . $e->getMessage()], 500);
            }
        }

        // 10. ★ (NEW) QRコードIDの準備
        $qrCodeId = null;
        if ($deliveryMethod === 'venue') {
            $qrCodeId = Str::uuid(); // '会場受取り' の場合のみUUIDを生成
        }

        // 10. ★ DBトランザクション (在庫の引き当てと注文の作成を同時に行う)
        try {
            $order = DB::transaction(function () use ($user, $product, $quantity, $totalPrice, $paymentMethod, $deliveryMethod, $shippingAddress, $stripePaymentIntentId, $qrCodeId) {

                // 10-a. 在庫を引き当てる (減らす)
                $product->decrement('stock', $quantity);

                // 10-b. 注文 (Order) を作成
                $order = Order::create([
                    'user_id' => $user->id,
                    'total_price' => $totalPrice,
                    'status' => 'pending',
                    'payment_method' => $paymentMethod,
                    'delivery_method' => $deliveryMethod,
                    'shipping_address' => $shippingAddress,
                    'stripe_payment_intent_id' => $stripePaymentIntentId,
                    'qr_code_id' => $qrCodeId, // 👈 ★ ここに $qrCodeId を保存
                ]);

                // 10-c. 注文明細 (OrderItem) を作成
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price_at_purchase' => $product->price, // 「購入時点」の価格
                    'product_name' => $product->name, // 「購入時点」の商品名
                ]);

                return $order; // トランザクションの結果として $order を返す
            });
        } catch (\Exception $e) {
            // もしトランザクションに失敗したら (例: 在庫引き当てに失敗など)
            return response()->json(['message' => '注文の作成に失敗しました: ' . $e->getMessage()], 500);
        }

        // 11. ★ フロントエンドにレスポンスを返す
        return response()->json([
            'message' => '注文を受け付けました',
            'order' => $order->load('items'), // 作成された注文情報 (明細も含む)
            'clientSecret' => $clientSecret, // Stripe決済の場合、決済シート用の秘密キー
        ], 201); // 201 Created
    }

    /**
     * QRコードをスキャンして注文を処理（引き換え）する (redeem)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function redeem(Request $request)
    {
        // A. 権限チェック (スキャンする人 ＝ アーティストか？)
        /** @var \App\Models\User $artist */
        $artist = Auth::user();
        if ($artist->role !== 'artist' && $artist->role !== 'admin') {
            return response()->json(['message' => 'この操作を行う権限がありません'], 403);
        }

        // B. バリデーション (QRコードIDが送られてきたか？)
        $validatedData = $request->validate([
            'qr_code_id' => 'required|string|uuid|exists:orders,qr_code_id',
        ]);

        // C. 注文の検索
        $order = Order::where('qr_code_id', $validatedData['qr_code_id'])
            ->with('items.product') // ★ 商品とアーティストIDをチェックするため
            ->firstOrFail();

        // D. ビジネスロジックの検証

        // D-1. 会場受取りの注文か？
        if ($order->delivery_method !== 'venue') {
            return response()->json(['message' => 'この注文は会場受取りではありません'], 422);
        }

        // D-2. 既に処理済み（受取済み）ではないか？
        if ($order->status === 'redeemed') {
            return response()->json(['message' => 'このQRコードは既に使用（受取済み）されています'], 409); // 409 Conflict
        }

        // D-3. (重要) スキャンしたアーティストが、この商品の作成者か？
        // (管理者の場合はこのチェックをスキップ)
        if ($artist->role !== 'admin') {
            $product = $order->items->first()->product; // 注文の最初の商品を取得

            // 商品が存在し、その商品の artist_id がスキャンした人の id と一致するか
            if (!$product || $product->artist_id !== $artist->id) {
                return response()->json(['message' => 'あなたが作成した商品の注文ではありません'], 403);
            }
        }

        // E. 注文ステータスの更新
        // 'pending' (現金待ち) または 'paid' (クレカ払い済み)
        // どちらの場合でも「受取済み」に更新する
        $order->update([
            'status' => 'redeemed' // 👈 ★「受取済み」に更新
        ]);

        // F. 成功レスポンス (アーティストの画面に注文詳細を表示するため)
        return response()->json([
            'message' => '商品の引き換えが完了しました。',
            'order' => $order->load('items', 'user'), // ユーザー情報も付けて返す
        ]);
    }

    /**
     * Stripe PaymentIntent を作成するプライベートメソッド
     * (このロジックは、以前の PaymentController にあったものとほぼ同じです)
     */
    private function createStripePaymentIntent(int $totalPriceInCents, $user)
    {
        // 秘密鍵を .env から読み込む
        Stripe::setApiKey(env('STRIPE_SECRET'));

        // (オプション) Stripe側に顧客情報 (Customer) があれば使う
        // $customer = Customer::create([ 'email' => $user->email, ... ]);
        // $customerId = $customer->id;

        return PaymentIntent::create([
            'amount' => $totalPriceInCents, // JPY (セント単位 = 円)
            'currency' => 'jpy',
            'automatic_payment_methods' => [
                'enabled' => true,
            ],
            'description' => 'NOKKU グッズ購入',
            // 'customer' => $customerId, // 顧客ID (オプション)
        ]);
    }
}
