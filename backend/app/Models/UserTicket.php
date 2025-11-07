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
}