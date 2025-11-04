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
        'price',
        'total_tickets',
        'artist_id',
    ];
}