<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate[Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    // ↓↓↓ この行を追記 ↓↓↓
    protected $fillable = [
        'name',
        'description',
        'price',
        'stock',
        'image_url',
        'artist_id',
    ];
}