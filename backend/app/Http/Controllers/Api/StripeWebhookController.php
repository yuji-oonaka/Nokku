<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;
use App\Models\Order;
use App\Models\UserTicket;
use App\Models\TicketType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\OrderConfirmationMail;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        Stripe::setApiKey(config('services.stripe.secret'));
        $endpointSecret = config('services.stripe.webhook_secret');

        $payload = $request->getContent(); // ★ 修正: Sail環境でより確実な取得方法
        $sigHeader = $request->header('Stripe-Signature');
        $event = null;

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\UnexpectedValueException $e) {
            return response('Invalid payload', 400);
        } catch (SignatureVerificationException $e) {
            return response('Invalid signature', 400);
        }

        if ($event->type === 'payment_intent.succeeded') {
            $this->handlePaymentIntentSucceeded($event->data->object);
        }

        return response('Webhook Handled', 200);
    }

    private function handlePaymentIntentSucceeded($paymentIntent)
    {
        $metadata = $paymentIntent->metadata;
        $orderId = $metadata->order_id ?? null;

        if (!$orderId) {
            Log::warning("Webhook received without order_id: {$paymentIntent->id}");
            return;
        }

        // トランザクションで注文確定とチケット発行をアトミックに実行
        DB::transaction(function () use ($orderId, $paymentIntent) {
            // 1. 注文レコードをロックして取得
            $order = Order::with(['user', 'items.ticketType'])->lockForUpdate()->find($orderId);

            if (!$order || $order->status === 'paid' || $order->status === 'completed') {
                return;
            }

            // 2. ステータス更新
            $order->update([
                'status' => 'paid',
                'stripe_payment_intent_id' => $paymentIntent->id,
            ]);

            // 3. チケットが含まれる場合、入場券(UserTicket)を発行
            foreach ($order->items as $item) {
                if ($item->ticket_type_id) {
                    $this->issueUserTickets($order, $item, $paymentIntent->id);
                }
            }

            // 4. メール送信 (トランザクション後でも良いが、既存ロジックを尊重)
            $this->sendConfirmationEmail($order);
        });
    }

    private function issueUserTickets(Order $order, $orderItem, $stripeId)
    {
        $ticketType = $orderItem->ticketType;

        for ($i = 0; $i < $orderItem->quantity; $i++) {
            // 在庫数から座席番号を算出する既存ロジックの移植 [cite: 120-122]
            // ※ remaining_countは既に減算済みなので、capacityとの差分で算出
            $issuedCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();
            $seatNum = $issuedCount + 1;

            $seatNumber = ($ticketType->seating_type === 'random')
                ? $ticketType->name . '-' . $seatNum
                : '自由席-' . $seatNum;

            UserTicket::create([
                'user_id'           => $order->user_id,
                'order_id'          => $order->id,        // ★ 統合された注文ID
                'ticket_type_id'    => $ticketType->id,
                'event_id'          => $ticketType->event_id,
                'stripe_payment_id' => $stripeId,
                'seat_number'       => $seatNumber,
                'qr_code_id'        => (string) Str::uuid(),
                'status'            => UserTicket::STATUS_VALID, // ★ Step 1-6の定数
            ]);
        }
        Log::info("Tickets issued for Order #{$order->id}, Item #{$orderItem->id}");
    }

    private function sendConfirmationEmail($order)
    {
        if ($order->user) {
            try {
                Mail::to($order->user->email)->send(new OrderConfirmationMail($order));
            } catch (\Exception $e) {
                Log::error("Mail failed: " . $e->getMessage());
            }
        }
    }
}
