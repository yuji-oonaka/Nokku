<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ticket_type_id',
        'event_id',
        'stripe_payment_id',
        'seat_number',
        'qr_code_id',
        'is_used',
        'used_at', // 使用日時も記録できるように追加しておくと便利です
    ];

    /**
     * このチケットが属するイベント（Event）を取得 (多対1)
     */
    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * このチケットの券種（TicketType）を取得 (多対1)
     */
    public function ticketType()
    {
        return $this->belongsTo(TicketType::class);
    }

    /**
     * チケットの持ち主（User）を取得 (多対1)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
