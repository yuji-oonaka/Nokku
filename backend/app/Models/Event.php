<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    // ↓↓↓ この行を追記 ↓↓↓
    protected $fillable = [
        'title',
        'description',
        'venue',
        'event_date',
        'artist_id',
    ];

    /**
     * このイベントが持つ券種（TicketType）を取得 (1対多)
     */
    public function ticketTypes()
    {
        return $this->hasMany(TicketType::class);
    }
}