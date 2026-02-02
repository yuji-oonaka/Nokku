<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\TicketType;
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
    /**
     * 注文一覧を取得 (Roleに応じてスコープを切り替え)
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $query = Order::query();

        if ($user->isArtist()) {
            // ★販売者として：自分の商品が含まれる注文をすべて取得
            $query->forArtist($user->id);
        } else {
            // ★購入者として：自分が注文したもののみ取得
            $query->where('user_id', $user->id);
        }

        $orders = $query->with('items.product.artist')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    /**
     * 注文詳細を取得 (厳格な認可チェック)
     */
    public function show(Order $order)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 1. 管理者は無条件パス
        if ($user->isAdmin()) {
            return response()->json($order->load('items.product.artist'));
        }

        // 2. アーティストの場合：その注文に自分の商品が含まれているか確認
        if ($user->isArtist()) {
            $hasMyProduct = $order->items()->whereHas('product', function ($q) use ($user) {
                $q->where('artist_id', $user->id);
            })->exists();

            if ($hasMyProduct) {
                return response()->json($order->load('items.product.artist'));
            }
        }

        // 3. 一般ユーザーの場合：自分が注文したか確認
        if ($order->user_id === $user->id) {
            return response()->json($order->load('items.product.artist'));
        }

        // いずれにも該当しない場合は 403
        return response()->json(['message' => '指定された注文にアクセスする権限がありません。'], 403);
    }

    /**
     * 注文作成（排他制御対応版）
     */
    public function store(StoreOrderRequest $request)
    {
        $validated = $request->validated();
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        $quantity = $validated['quantity'];
        $paymentMethod = $validated['payment_method'];
        $deliveryMethod = $validated['delivery_method'];
        
        // ★修正: 商品かチケットか、いずれか一方を取得
        $productId = $validated['product_id'] ?? null;
        $ticketTypeId = $validated['ticket_type_id'] ?? null;

        // 1. 配送先情報の構築 (グッズ配送時のみ使用)
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

        try {
            return DB::transaction(function () use ($user, $productId, $ticketTypeId, $quantity, $paymentMethod, $deliveryMethod, $shippingAddress) {

                $targetItem = null;
                $totalPrice = 0;
                $itemName = '';

                // 2. 在庫の悲観ロック取得 (lockForUpdate)
                if ($productId) {
                    $targetItem = Product::where('id', $productId)->lockForUpdate()->first();
                    if ($targetItem->stock < $quantity) {
                        throw new \Exception('在庫が不足しています', 422);
                    }
                    // グッズ特有の購入制限チェック
                    if ($targetItem->limit_per_user) {
                        $pastQuantity = OrderItem::where('product_id', $targetItem->id)
                            ->whereHas('order', function ($query) use ($user) {
                                $query->where('user_id', $user->id)->where('status', '!=', 'cancelled');
                            })->sum('quantity');
                        if (($pastQuantity + $quantity) > $targetItem->limit_per_user) {
                            throw new \Exception("お一人様 {$targetItem->limit_per_user} 点までです。", 409);
                        }
                    }
                    $itemName = $targetItem->name;
                } elseif ($ticketTypeId) {
                    // ★チケット在庫の悲観ロック
                    $targetItem = TicketType::where('id', $ticketTypeId)->lockForUpdate()->first();
                    if ($targetItem->remaining_count < $quantity) {
                        throw new \Exception('チケットが売り切れました。', 422);
                    }
                    $itemName = $targetItem->name;
                }

                $totalPrice = $targetItem->price * $quantity;

                // 3. Stripe決済インテントの作成
                $clientSecret = null;
                $stripePaymentIntentId = null;

                if ($paymentMethod === 'stripe') {
                    Stripe::setApiKey(config('services.stripe.secret'));
                    $paymentIntent = PaymentIntent::create([
                        'amount' => $totalPrice,
                        'currency' => 'jpy',
                        'automatic_payment_methods' => ['enabled' => true],
                        'description' => $productId ? 'NOKKU グッズ購入' : 'NOKKU チケット購入',
                        'metadata' => [
                            'type' => $productId ? 'product' : 'ticket', // ★ Webhookでの判別用
                            'user_id' => $user->id,
                            'item_id' => $productId ?? $ticketTypeId,
                        ],
                    ]);
                    $clientSecret = $paymentIntent->client_secret;
                    $stripePaymentIntentId = $paymentIntent->id;
                }

                // 4. 会場受取/入場用の注文QR生成 (既存ロジック維持)
                $qrCodeId = ($deliveryMethod === 'venue') ? (string) Str::uuid() : null;

                // 5. 在庫減算
                if ($productId) {
                    $targetItem->decrement('stock', $quantity);
                } else {
                    $targetItem->decrement('remaining_count', $quantity); // ★追加: チケット在庫減算
                }

                // 6. 注文(Order)と明細(OrderItem)の作成
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

                if ($qrCodeId) {
                    app(\App\Services\TicketAdmissionService::class)->syncToFirestore(
                        $qrCodeId,
                        'paid',
                        $user->id,
                        '未引換',
                        null,
                        'order_status'
                    );
                }

                $order->items()->create([
                    'product_id' => $productId,
                    'ticket_type_id' => $ticketTypeId, // ★ Step 1-3で追加したカラム
                    'quantity' => $quantity,
                    'price_at_purchase' => $targetItem->price,
                    'product_name' => $itemName,
                ]);

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
            $code = $e->getCode();
            $status = (is_int($code) && $code >= 400 && $code < 600) ? $code : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }
}
