<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product; // グッズモデル
use App\Models\TicketType; // 👈 修正済み
use App\Models\UserTicket; // 👈 1. UserTicketモデルを use する
use Illuminate\Support\Facades\Auth; // 👈 2. Authを use する
use Illuminate\Support\Facades\DB; // 👈 3. DBトランザクションを use する
use Illuminate\Support\Str; // 👈 4. QRコード用のUUIDを use する
use Stripe\Stripe;
use Stripe\PaymentIntent;

class PaymentController extends Controller
{
    /**
     * グッズのPaymentIntentを作成する (正常)
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

        // 3. 合計金額を計算
        $amount = $product->price * $validated['quantity'];

        try {
            // 4. Stripe秘密鍵をセット
            Stripe::setApiKey(config('services.stripe.secret'));

            // 5. Stripeに「決済ID (PaymentIntent)」の作成をリクエスト
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy',
                'automatic_payment_methods' => ['enabled' => true],
            ]);

            // 6. フロントエンドに「client_secret」を返す
            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $amount,
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }


    /**
     * チケットのPaymentIntentを作成する (★ここがエラーの原因)
     */
    public function createTicketPaymentIntent(Request $request)
    {
        // 1. バリデーション (テーブル名を 'ticket_types' に修正)
        $validated = $request->validate([
            'ticket_id' => 'required|integer|exists:ticket_types,id', // 👈 修正
            'quantity' => 'required|integer|min:1',
        ]);

        // 2. モデル名 (Ticket -> TicketType に修正)
        $ticket = TicketType::findOrFail($validated['ticket_id']); // 👈 修正

        // 3. 合計金額を計算
        $amount = $ticket->price * $validated['quantity'];

        try {
            // 4. Stripe秘密鍵をセット
            Stripe::setApiKey(config('services.stripe.secret'));

            // 5. Stripeに「決済ID (PaymentIntent)」の作成をリクエスト
            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy',
                'automatic_payment_methods' => ['enabled' => true],
                'metadata' => [
                    'ticket_type_id' => $ticket->id, // 👈 'ticket_id' から変更
                    'quantity' => $validated['quantity'],
                    'event_id' => $ticket->event_id,
                ]
            ]);

            // 7. フロントエンドに client_secret を返す
            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'amount' => $amount,
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * チケット購入を確定し、UserTicketを作成する
     */
    public function confirmTicketPurchase(Request $request)
    {
        // 1. バリデーション
        $validated = $request->validate([
            'ticket_type_id' => 'required|integer|exists:ticket_types,id',
            'quantity' => 'required|integer|min:1',
            'stripe_payment_id' => 'required|string', // Stripe決済ID
        ]);

        $user = Auth::user();
        $ticketType = TicketType::findOrFail($validated['ticket_type_id']);

        // 2. データベーストランザクションを開始
        // (在庫確認と購入確定を「全か無か」で行うため)
        try {
            DB::beginTransaction();

            // 3. 在庫（キャパシティ）の確認 (ロックして二重購入を防止)
            $ticketType = TicketType::where('id', $validated['ticket_type_id'])->lockForUpdate()->first();

            if ($ticketType->capacity < $validated['quantity']) {
                throw new \Exception('チケットが売り切れました。');
            }

            $createdUserTickets = [];

            // 4. 購入枚数分 (quantity) の UserTicket を作成
            for ($i = 0; $i < $validated['quantity']; $i++) {
                
                // 5. 座席番号の割り当て
                $seatNumber = null;
                if ($ticketType->seating_type === 'random') {
                    // 「S席」+ 既に売れた枚数 + 1 (例: S席-1, S席-2)
                    // (※ 本来はもっと複雑な座席割り当てロジックが必要です)
                    $soldCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();
                    $seatNumber = $ticketType->name . '-' . ($soldCount + 1);
                } else {
                    // 'free' (自由席)
                    $soldCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();
                    $seatNumber = '自由席-' . ($soldCount + 1);
                }

                // 6. UserTicket をDBに保存
                $userTicket = UserTicket::create([
                    'user_id' => $user->id,
                    'ticket_type_id' => $ticketType->id,
                    'event_id' => $ticketType->event_id,
                    'stripe_payment_id' => $validated['stripe_payment_id'],
                    'seat_number' => $seatNumber,
                    'qr_code_id' => (string) Str::uuid(), // 👈 7. 一意のQRコードIDを生成
                    'is_used' => false,
                ]);
                $createdUserTickets[] = $userTicket;
            }

            // 8. 在庫（キャパシティ）を減らす
            $ticketType->capacity = $ticketType->capacity - $validated['quantity'];
            $ticketType->save();

            // 9. トランザクションを確定
            DB::commit();

            // 10. 成功：作成されたチケット情報を返す
            return response()->json([
                'message' => 'チケットの購入が完了しました！',
                'tickets' => $createdUserTickets
            ], 201); // 201 Created

        } catch (\Exception $e) {
            // 11. エラー：トランザクションをロールバック
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}