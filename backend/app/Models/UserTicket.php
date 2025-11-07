<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserTicket extends Model
{
    use HasFactory;

    // ↓↓↓ この行を追記 ↓↓↓
    protected $fillable = [
        'user_id',
        'ticket_type_id',
        'event_id',
        'stripe_payment_id',
        'seat_number',
        'qr_code_id',
        'is_used',
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
}