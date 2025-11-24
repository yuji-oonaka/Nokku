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

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        Stripe::setApiKey(config('services.stripe.secret'));
        $endpointSecret = config('services.stripe.webhook_secret');

        $payload = @file_get_contents('php://input');
        $sigHeader = $request->header('Stripe-Signature');
        $event = null;

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\UnexpectedValueException $e) {
            Log::error('Stripe Webhook Error: Invalid payload');
            return response('Invalid payload', 400);
        } catch (SignatureVerificationException $e) {
            Log::error('Stripe Webhook Error: Invalid signature');
            return response('Invalid signature', 400);
        }

        switch ($event->type) {
            case 'payment_intent.succeeded':
                $paymentIntent = $event->data->object;
                $this->handlePaymentIntentSucceeded($paymentIntent);
                break;
            default:
                // Handle other event types
        }

        return response('Webhook Handled', 200);
    }

    private function handlePaymentIntentSucceeded($paymentIntent)
    {
        $stripeId = $paymentIntent->id;
        Log::info("Stripe Payment Succeeded: {$stripeId}");

        $metadata = $paymentIntent->metadata;

        if (isset($metadata->order_id)) {
            // グッズ注文の確定
            $this->confirmOrder($metadata->order_id, $stripeId);
        } elseif (isset($metadata->ticket_type_id)) {
            // チケット購入の確定
            $this->confirmTicket($metadata, $stripeId);
        }
    }

    private function confirmOrder($orderId, $stripeId)
    {
        $order = Order::find($orderId);
        if ($order && $order->status === 'pending') {
            $order->update([
                'status' => 'paid',
                'stripe_payment_intent_id' => $stripeId,
            ]);
            Log::info("Order #{$order->id} confirmed via Webhook.");
        }
    }

    private function confirmTicket($metadata, $stripeId)
    {
        // ★★★ 修正: 二重発行を防ぐため、Webhookでのチケット作成を停止 ★★★
        // アプリ側の confirmTicketPurchase で作成されるのを信頼します。
        Log::info("Webhook: confirmTicket called for {$stripeId}, but skipping to avoid duplication.");
        return;

        /* --- 以下、元のコードをコメントアウト ---
        $exists = UserTicket::where('stripe_payment_id', $stripeId)->exists();
        if ($exists) {
            return;
        }

        $ticketTypeId = (int) $metadata->ticket_type_id;
        $userId = (int) $metadata->user_id;
        $quantity = (int) $metadata->quantity;
        $ticketType = TicketType::find($ticketTypeId);

        if (!$ticketType) return;

        DB::transaction(function () use ($ticketType, $userId, $quantity, $stripeId) {
            for ($i = 0; $i < $quantity; $i++) {
                $seatNumber = ($ticketType->seating_type === 'random')
                    ? $ticketType->name . '-' . (UserTicket::where('ticket_type_id', $ticketType->id)->count() + 1)
                    : '自由席-' . (UserTicket::where('ticket_type_id', $ticketType->id)->count() + 1);

                UserTicket::create([
                    'user_id' => $userId,
                    'ticket_type_id' => $ticketType->id,
                    'event_id' => $ticketType->event_id,
                    'stripe_payment_id' => $stripeId,
                    'seat_number' => $seatNumber,
                    'qr_code_id' => (string) Str::uuid(),
                    'is_used' => false,
                ]);
            }
            $ticketType->decrement('capacity', $quantity);
        });
        Log::info("Tickets created via Webhook for User {$userId}");
        ------------------------------------------------------- */
    }
}
