<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // ★ 追加

class UserTicket extends Model
{
    use HasFactory;

    // ★ ステータスの定数定義 (タイポ防止と可読性のため)
    const STATUS_VALID = 'valid';
    const STATUS_USED = 'used';
    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'user_id',
        'order_id',
        'ticket_type_id',
        'event_id',
        'stripe_payment_id',
        'seat_number',
        'qr_code_id',
        'status',
        'used_at',
    ];

    /**
     * このチケットが属する注文 (Order) を取得
     */
    public function order(): BelongsTo // ★ 追加
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * このチケットが属するイベント (Event) を取得
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * このチケットの券種 (TicketType) を取得
     */
    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }

    /**
     * チケットの持ち主 (User) を取得
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
