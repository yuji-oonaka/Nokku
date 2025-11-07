<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketType extends Model
{
    use HasFactory;

    // ↓↓↓ この行を追記 ↓↓↓
    protected $fillable = [
        'event_id',
        'name',
        'price',
        'capacity',
        'seating_type',
    ];

    /**
     * この券種が属するイベント（Event）を取得 (多対1)
     */
    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}