<?php

namespace App\Services;

use App\Models\TicketType;
use App\Models\UserTicket;
use App\Models\User;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TicketService
{
    public function issueTicketsFromOrder(Order $order, string $paymentId): void
    {
        DB::transaction(function () use ($order, $paymentId) {
            foreach ($order->items as $item) {
                if ($item->ticket_type_id) {
                    $this->createTickets($order->user, $order->id, $item->ticket_type_id, $item->quantity, $paymentId);
                }
            }
        });
    }

    private function createTickets(User $user, int $orderId, int $ticketTypeId, int $quantity, string $paymentId): void
    {
        $ticketType = TicketType::where('id', $ticketTypeId)->lockForUpdate()->firstOrFail();
        $currentSoldCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();

        for ($i = 0; $i < $quantity; $i++) {
            $seatNum = $currentSoldCount + 1 + $i;
            $seatNumber = ($ticketType->seating_type === 'random')
                ? $ticketType->name . '-' . $seatNum
                : '自由席-' . $seatNum;

            $userTicket = UserTicket::create([
                'user_id'           => $user->id,
                'order_id'          => $orderId,
                'ticket_type_id'    => $ticketType->id,
                'event_id'          => $ticketType->event_id,
                'stripe_payment_id' => $paymentId,
                'seat_number'       => $seatNumber,
                'qr_code_id'        => (string) Str::uuid(),
                'status'            => UserTicket::STATUS_VALID,
            ]);

            // ★ 修正: DBのコミットが完全に確定した後に Firestore と同期する
            // 外部通信の遅延やエラーが、DBのチケット発行処理を邪魔しないようにします
            DB::afterCommit(function () use ($userTicket) {
                app(TicketAdmissionService::class)->syncToFirestore(
                    $userTicket->qr_code_id,
                    UserTicket::STATUS_VALID,
                    $userTicket->user_id,
                    $userTicket->seat_number
                );
            });
        }
    }
}
