<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\OrderItem;
// ★追加: 相互チェックのために UserTicket モデルを使えるようにする
use App\Models\UserTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $orders = Order::where('user_id', $user->id)
            ->with('items.product')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($orders);
    }

    public function store(Request $request)
    {
        // (変更なしのため省略しますが、完全なファイルとして出力します)
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

        if ($product->stock < $quantity) {
            return response()->json(['message' => '在庫が不足しています'], 422);
        }

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
        $totalPriceInCents = $totalPrice;
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
                $paymentIntent = $this->createStripePaymentIntent($totalPriceInCents, $user);
                $clientSecret = $paymentIntent->client_secret;
                $stripePaymentIntentId = $paymentIntent->id;
            } catch (\Exception $e) {
                return response()->json(['message' => '決済の準備に失敗しました: ' . $e->getMessage()], 500);
            }
        }

        $qrCodeId = null;
        if ($deliveryMethod === 'venue') {
            $qrCodeId = Str::uuid();
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
        } catch (\Exception $e) {
            return response()->json(['message' => '注文の作成に失敗しました: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => '注文を受け付けました',
            'order' => $order->load('items'),
            'clientSecret' => $clientSecret,
        ], 201);
    }

    /**
     * ★★★ QRコード引き換え処理 (redeem) ★★★
     */
    public function redeem(Request $request)
    {
        $targetId = $request->input('order_item_id') ?? $request->input('qr_code_id');

        if (!$targetId) {
            return response()->json(['message' => 'IDが必要です'], 422);
        }

        /** @var \App\Models\User $artist */
        $artist = Auth::user();

        if ($artist->role !== 'artist' && $artist->role !== 'admin') {
            return response()->json(['message' => 'この操作を行う権限がありません'], 403);
        }

        $orderItem = null;

        if (Str::isUuid($targetId)) {
            $order = Order::where('qr_code_id', $targetId)->first();
            if ($order) {
                $orderItem = $order->items->first();
            }
        } else {
            $orderItem = OrderItem::find($targetId);
        }

        if (!$orderItem) {
            // ★★★ 親切設計: もし注文でなければ、チケットかどうか確認する ★★★
            // targetId が UUID であれば UserTicket を探してみる
            $isTicket = UserTicket::where('qr_code_id', $targetId)->exists();

            if ($isTicket) {
                return response()->json([
                    'message' => 'これは入場チケット用のQRコードです。「チケット入場」モードに切り替えてください。'
                ], 400); // 400 Bad Request
            }

            return response()->json(['message' => '該当する注文が見つかりません'], 404);
        }

        $orderItem->load('product');

        if ($artist->role !== 'admin') {
            $product = $orderItem->product;
            if (!$product || $product->artist_id !== $artist->id) {
                return response()->json([
                    'message' => '権限がありません。他者のイベントのグッズは引き換えできません。'
                ], 403);
            }
        }

        if ($orderItem->is_redeemed) {
            return response()->json(['message' => '既に引き換え済みの商品です'], 409);
        }

        if ($orderItem->order && $orderItem->order->delivery_method !== 'venue') {
            return response()->json(['message' => 'この注文は会場受取りではありません'], 422);
        }

        $orderItem->update([
            'is_redeemed' => true,
            'redeemed_at' => now(),
        ]);

        if ($orderItem->order) {
            $orderItem->order->update(['status' => 'redeemed']);
        }

        return response()->json([
            'message' => '引き換えが完了しました',
            'order' => $orderItem->order ? $orderItem->order->load('items', 'user') : null,
            'data' => $orderItem
        ]);
    }

    private function createStripePaymentIntent(int $totalPriceInCents, $user)
    {
        Stripe::setApiKey(env('STRIPE_SECRET'));

        return PaymentIntent::create([
            'amount' => $totalPriceInCents,
            'currency' => 'jpy',
            'automatic_payment_methods' => [
                'enabled' => true,
            ],
            'description' => 'NOKKU グッズ購入',
        ]);
    }
}
