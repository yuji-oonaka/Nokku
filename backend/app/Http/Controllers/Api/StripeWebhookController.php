<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Stripe\Stripe;
use Stripe\Webhook;
use App\Models\Order;
use App\Services\TicketService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        Stripe::setApiKey(config('services.stripe.secret'));
        $endpointSecret = config('services.stripe.webhook_secret');

        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\Exception $e) {
            return response('Invalid payload/signature', 400);
        }

        if ($event->type === 'payment_intent.succeeded') {
            $this->handlePaymentIntentSucceeded($event->data->object);
        }
        // ★決済失敗・キャンセル時の即時在庫復元
        elseif (in_array($event->type, ['payment_intent.payment_failed', 'payment_intent.canceled'])) {
            $this->handlePaymentIntentFailed($event->data->object);
        }

        return response('Webhook Handled', 200);
    }

    private function handlePaymentIntentSucceeded($paymentIntent)
    {
        $orderId = $paymentIntent->metadata->order_id ?? null;
        if (!$orderId) return;

        DB::transaction(function () use ($orderId, $paymentIntent) {
            // 注文情報をロックして取得
            $order = Order::with(['user', 'items.ticketType'])->lockForUpdate()->find($orderId);

            if (!$order || $order->status === 'paid' || $order->status === 'completed') {
                return;
            }

            // 1. 注文ステータス更新
            $order->update([
                'status' => 'paid',
                'stripe_payment_intent_id' => $paymentIntent->id,
            ]);

            // 2. 統合された TicketService で発券を実行 (is_usedは含まれない)
            app(TicketService::class)->issueTicketsFromOrder($order, $paymentIntent->id);

            Log::info("Order #{$orderId} marked as paid and tickets issued.");
        });
    }

    private function handlePaymentIntentFailed($paymentIntent)
    {
        $orderId = $paymentIntent->metadata->order_id ?? null;
        if (!$orderId) return;

        DB::transaction(function () use ($orderId) {
            $order = Order::with('items')->lockForUpdate()->find($orderId);

            if (!$order || $order->status !== 'pending') return;

            foreach ($order->items as $item) {
                if ($item->product_id) {
                    $item->product()->increment('stock', $item->quantity);
                } elseif ($item->ticket_type_id) {
                    $item->ticketType()->increment('remaining_count', $item->quantity);
                }
            }
            $order->update(['status' => 'cancelled']);
            Log::info("Order #{$orderId} was cancelled and inventory restored.");
        });
    }
}
