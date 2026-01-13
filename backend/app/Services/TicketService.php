<?php

namespace App\Services;

use App\Models\TicketType;
use App\Models\UserTicket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class TicketService
{
    /**
     * チケットを購入・発券する
     * * @param User $user 購入者
     * @param int $ticketTypeId チケット種別ID
     * @param int $quantity 枚数
     * @param string $paymentId 決済ID (Stripe PaymentIntent ID)
     * @return array 作成されたUserTicketの配列
     * @throws Exception 在庫切れやエラー時
     */
    public function purchaseTickets(User $user, int $ticketTypeId, int $quantity, string $paymentId): array
    {
        // トランザクション内で実行
        return DB::transaction(function () use ($user, $ticketTypeId, $quantity, $paymentId) {

            // 1. 排他ロックをかけてチケット情報を取得 (同時購入対策)
            $ticketType = TicketType::where('id', $ticketTypeId)
                ->lockForUpdate()
                ->firstOrFail();

            // 2. 在庫チェック
            if ($ticketType->capacity < $quantity) {
                throw new Exception('チケットが売り切れました。');
            }

            // 3. チケットデータの作成
            $createdTickets = [];
            // 現在の販売枚数を取得 (座席番号採番用)
            // ※ lockForUpdate中なので、この時点での枚数は確定している
            $currentSoldCount = UserTicket::where('ticket_type_id', $ticketType->id)->count();

            for ($i = 0; $i < $quantity; $i++) {
                $seatNum = $currentSoldCount + 1 + $i;

                // 座席番号の決定
                $seatNumber = ($ticketType->seating_type === 'random')
                    ? $ticketType->name . '-' . $seatNum
                    : '自由席-' . $seatNum;

                $userTicket = UserTicket::create([
                    'user_id'           => $user->id,
                    'ticket_type_id'    => $ticketType->id,
                    'event_id'          => $ticketType->event_id,
                    'stripe_payment_id' => $paymentId,
                    'seat_number'       => $seatNumber,
                    'qr_code_id'        => (string) Str::uuid(),
                    'is_used'           => false,
                ]);

                $createdTickets[] = $userTicket;
            }

            // 4. 在庫を減らす
            $ticketType->decrement('capacity', $quantity);

            return $createdTickets;
        });
    }
}
