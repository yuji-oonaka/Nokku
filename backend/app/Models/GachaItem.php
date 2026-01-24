<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GachaItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'gacha_id',
        'profile_item_id',
        'probability_weight',
        'is_pickup',
    ];

    public function gacha()
    {
        return $this->belongsTo(Gacha::class);
    }

    public function profileItem()
    {
        return $this->belongsTo(ProfileItem::class);
    }
}
