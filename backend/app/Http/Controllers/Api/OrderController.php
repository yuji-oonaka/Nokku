<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    // index, show は変更なしのため省略可能ですが、念のためそのまま残してください。
    
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $orders = Order::where('user_id', $user->id)
            ->with('items.product.artist')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($orders);
    }

    public function show(Order $order)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($order->user_id !== $user->id) {
            return response()->json(['message' => '権限がありません'], 403);
        }

        return response()->json($order->load('items.product.artist'));
    }

    /**
     * 注文作成（排他制御対応版）
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'payment_method' => ['required', 'string', Rule::in(['stripe', 'cash'])],
            'delivery_method' => ['required', 'string', Rule::in(['mail', 'venue'])],
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $quantity = $validatedData['quantity'];
        $paymentMethod = $validatedData['payment_method'];
        $deliveryMethod = $validatedData['delivery_method'];
        $productId = $validatedData['product_id'];

        // 配送先情報の構築
        $shippingAddress = null;
        if ($deliveryMethod === 'mail') {
            if (empty($user->postal_code) || empty($user->prefecture) || empty($user->city) || empty($user->address_line1)) {
                return response()->json(['message' => '配送先住所が登録されていません。プロフィールから登録してください。'], 422);
            }
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

        // ★★★ トランザクション開始 ★★★
        // 在庫チェックから注文作成までを一気通貫で行うことで整合性を保つ
        try {
            return DB::transaction(function () use ($user, $productId, $quantity, $paymentMethod, $deliveryMethod, $shippingAddress) {
                
                // 1. 商品行をロックして取得 (悲観ロック)
                // この処理中、他のユーザーはこのproduct_idの行を読み込めず待機状態になる
                $product = Product::where('id', $productId)->lockForUpdate()->first();

                // 2. 厳密な在庫チェック
                if ($product->stock < $quantity) {
                    throw new \Exception('在庫が不足しています', 422);
                }

                // 3. 購入制限チェック (OrderItemの集計もロックの影響を受けるため安全)
                if ($product->limit_per_user) {
                    $pastQuantity = OrderItem::where('product_id', $product->id)
                        ->whereHas('order', function ($query) use ($user) {
                            $query->where('user_id', $user->id)
                                ->where('status', '!=', 'cancelled');
                        })
                        ->sum('quantity'); // ※ここも厳密にするならOrderItemテーブルもロックが必要だが、今回はProductロックで緩和

                    if (($pastQuantity + $quantity) > $product->limit_per_user) {
                        throw new \Exception("お一人様 {$product->limit_per_user} 点までです。(過去の購入数: {$pastQuantity})", 409);
                    }
                }

                $totalPrice = $product->price * $quantity;

                // 4. Stripe決済等の外部API呼び出し
                // 注意: トランザクション内での外部APIコールは、レスポンス待ちでDBロックが長引くリスクがあるが、
                // 在庫確保を優先するため今回は許容する。高負荷時は「仮注文→決済→本注文」への分離が必要。
                $clientSecret = null;
                $stripePaymentIntentId = null;

                if ($paymentMethod === 'stripe') {
                    Stripe::setApiKey(config('services.stripe.secret'));
                    try {
                        $paymentIntent = PaymentIntent::create([
                            'amount' => $totalPrice, // JPY
                            'currency' => 'jpy',
                            'automatic_payment_methods' => ['enabled' => true],
                            'description' => 'NOKKU グッズ購入',
                            'metadata' => [
                                'type' => 'order',
                                'user_id' => $user->id,
                                'product_id' => $product->id,
                            ]
                        ]);
                        $clientSecret = $paymentIntent->client_secret;
                        $stripePaymentIntentId = $paymentIntent->id;
                    } catch (\Exception $e) {
                        throw new \Exception('決済システムの接続に失敗しました: ' . $e->getMessage(), 500);
                    }
                }

                $qrCodeId = ($deliveryMethod === 'venue') ? (string) Str::uuid() : null;

                // 5. 在庫減算と注文作成
                $product->decrement('stock', $quantity);

                $order = Order::create([
                    'user_id' => $user->id,
                    'total_price' => $totalPrice,
                    'status' => 'pending',
                    'payment_method' => $paymentMethod,
                    'delivery_method' => $deliveryMethod,
                    'shipping_address' => $shippingAddress,
                    'stripe_payment_intent_id' => $stripePaymentIntentId,
                    'qr_code_id' => $qrCodeId,
                ]);

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price_at_purchase' => $product->price,
                    'product_name' => $product->name,
                ]);

                // Stripeメタデータ更新 (Order ID紐付け)
                if ($paymentMethod === 'stripe' && $stripePaymentIntentId) {
                    PaymentIntent::update($stripePaymentIntentId, [
                        'metadata' => ['order_id' => $order->id]
                    ]);
                }

                return response()->json([
                    'message' => '注文を受け付けました',
                    'order' => $order->load('items'),
                    'clientSecret' => $clientSecret,
                ], 201);
            });

        } catch (\Exception $e) {
            // エラーコードの処理
            $status = $e->getCode();
            if ($status < 100 || $status > 599) $status = 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }
}