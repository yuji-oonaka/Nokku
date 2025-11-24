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
// use Kreait\Laravel\Firebase\Facades\Firebase; // ★ 削除: このコントローラーではもう使いません

class OrderController extends Controller
{
    /**
     * ログイン中のユーザーの注文履歴を取得
     */
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

    /**
     * 注文詳細取得
     */
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
     * 注文作成
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
        $product = Product::find($validatedData['product_id']);
        $quantity = $validatedData['quantity'];
        $paymentMethod = $validatedData['payment_method'];
        $deliveryMethod = $validatedData['delivery_method'];

        // 在庫チェック
        if ($product->stock < $quantity) {
            return response()->json(['message' => '在庫が不足しています'], 422);
        }

        // 購入制限チェック
        if ($product->limit_per_user) {
            $pastQuantity = OrderItem::where('product_id', $product->id)
                ->whereHas('order', function ($query) use ($user) {
                    $query->where('user_id', $user->id)
                        ->where('status', '!=', 'cancelled');
                })
                ->sum('quantity');

            if (($pastQuantity + $quantity) > $product->limit_per_user) {
                return response()->json([
                    'message' => "お一人様 {$product->limit_per_user} 点までです。(過去の購入数: {$pastQuantity})"
                ], 409);
            }
        }

        $totalPrice = $product->price * $quantity;
        $stripeAmount = $totalPrice; // JPY

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

        $clientSecret = null;
        $stripePaymentIntentId = null;

        if ($paymentMethod === 'stripe') {
            try {
                Stripe::setApiKey(config('services.stripe.secret'));
                $paymentIntent = PaymentIntent::create([
                    'amount' => $stripeAmount,
                    'currency' => 'jpy',
                    'automatic_payment_methods' => ['enabled' => true],
                    'description' => 'NOKKU グッズ購入',
                    'metadata' => [
                        'type' => 'order',
                        'user_id' => $user->id,
                    ]
                ]);

                $clientSecret = $paymentIntent->client_secret;
                $stripePaymentIntentId = $paymentIntent->id;
            } catch (\Exception $e) {
                return response()->json(['message' => '決済の準備に失敗しました: ' . $e->getMessage()], 500);
            }
        }

        $qrCodeId = null;
        if ($deliveryMethod === 'venue') {
            $qrCodeId = (string) Str::uuid();
        }

        try {
            $order = DB::transaction(function () use ($user, $product, $quantity, $totalPrice, $paymentMethod, $deliveryMethod, $shippingAddress, $stripePaymentIntentId, $qrCodeId) {
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
                return $order;
            });

            // Webhook用メタデータ更新
            if ($paymentMethod === 'stripe' && $stripePaymentIntentId) {
                Stripe::setApiKey(config('services.stripe.secret'));
                PaymentIntent::update($stripePaymentIntentId, [
                    'metadata' => ['order_id' => $order->id]
                ]);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => '注文の作成に失敗しました: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => '注文を受け付けました',
            'order' => $order->load('items'),
            'clientSecret' => $clientSecret,
        ], 201);
    }

    // ★ redeem メソッドは OrderScanController に移動したため削除しました
}
