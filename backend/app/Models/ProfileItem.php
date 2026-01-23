<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProfileItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'image_url',
        'rarity',
        'probability_weight',
        'is_default',
    ];

    // Consts for types
    public const TYPE_ICON = 'icon';
    public const TYPE_FRAME = 'frame';
    public const TYPE_BACKGROUND = 'background';
}
