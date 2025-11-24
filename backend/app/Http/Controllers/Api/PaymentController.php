<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\TicketType;
use App\Models\UserTicket;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Carbon\Carbon;

class PaymentController extends Controller
{
    /**
     * グッズのPaymentIntentを作成する
     * (※ 現在は OrderController で処理している場合は不要ですが、残しておきます)
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
                // グッズ用メタデータ (OrderControllerを使うならここは使われません)
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
     * チケットのPaymentIntentを作成する (★ Webhook対応修正)
     */
    public function createTicketPaymentIntent(Request $request)
    {
        $validated = $request->validate([
            'ticket_id' => 'required|integer|exists:ticket_types,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $ticket = TicketType::findOrFail($validated['ticket_id']);

        // 過去イベントチェック
        if ($ticket->event && Carbon::parse($ticket->event->event_date)->endOfDay()->isPast()) {
            return response()->json(['message' => 'このイベントは既に終了しています'], 400);
        }

        $amount = $ticket->price * $validated['quantity'];

        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            $paymentIntent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => 'jpy',
                'automatic_payment_methods' => ['enabled' => true],
                // ★★★ 修正: Webhookに必要なメタデータを全て追加 ★★★
                'metadata' => [
                    'type' => 'ticket',            // ★ 必須: チケット購入であることを識別
                    'ticket_type_id' => $ticket->id,
                    'quantity' => $validated['quantity'],
                    'event_id' => $ticket->event_id,
                    'user_id' => Auth::id(),       // ★ 必須: 誰が買ったか
                ]
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
     * チケット購入を確定し、UserTicketを作成する
     * (アプリ側での即時完了用。Webhookがバックアップとして機能します)
     */
    public function confirmTicketPurchase(Request $request)
    {
        $validated = $request->validate([
            'ticket_type_id' => 'required|integer|exists:ticket_types,id',
            'quantity' => 'required|integer|min:1',
            'stripe_payment_id' => 'required|string',
        ]);

        // 二重作成防止: 既にWebhook等で作られていないかチェック
        $exists = UserTicket::where('stripe_payment_id', $validated['stripe_payment_id'])->exists();
        if ($exists) {
            return response()->json([
                'message' => 'チケットは既に作成されています',
                'tickets' => UserTicket::where('stripe_payment_id', $validated['stripe_payment_id'])->get()
            ], 200);
        }

        $user = Auth::user();

        try {
            DB::beginTransaction();

            $ticketType = TicketType::where('id', $validated['ticket_type_id'])->lockForUpdate()->first();

            if ($ticketType->capacity < $validated['quantity']) {
                throw new \Exception('チケットが売り切れました。');
            }

            $createdUserTickets = [];

            for ($i = 0; $i < $validated['quantity']; $i++) {
                $seatNumber = null;
                if ($ticketType->seating_type === 'random') {
                    $soldCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();
                    $seatNumber = $ticketType->name . '-' . ($soldCount + 1);
                } else {
                    $soldCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();
                    $seatNumber = '自由席-' . ($soldCount + 1);
                }

                $userTicket = UserTicket::create([
                    'user_id' => $user->id,
                    'ticket_type_id' => $ticketType->id,
                    'event_id' => $ticketType->event_id,
                    'stripe_payment_id' => $validated['stripe_payment_id'],
                    'seat_number' => $seatNumber,
                    'qr_code_id' => (string) Str::uuid(),
                    'is_used' => false,
                ]);
                $createdUserTickets[] = $userTicket;
            }

            $ticketType->decrement('capacity', $validated['quantity']);

            DB::commit();

            return response()->json([
                'message' => 'チケットの購入が完了しました！',
                'tickets' => $createdUserTickets
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
