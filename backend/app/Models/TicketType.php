<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketType extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'name',
        'price',
        'capacity',
        'seating_type',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    // ★ 追加: 販売数カウント用
    public function userTickets()
    {
        return $this->hasMany(UserTicket::class);
    }

    // ★ 追加: 残り枚数を確認するヘルパー
    public function isSoldOut()
    {
        return $this->userTickets()->count() >= $this->capacity;
    }
}