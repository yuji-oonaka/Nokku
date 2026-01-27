<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserGachaLog extends Model
{
    protected $fillable = [
        'user_id',
        'gacha_id',
        'gacha_item_id',
        'consumed_points',
        'status',
        'error_code',
        'is_duplicate',
        'refund_amount',
    ];

    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED = 'failed';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function gacha(): BelongsTo
    {
        return $this->belongsTo(Gacha::class);
    }
    public function gachaItem(): BelongsTo
    {
        return $this->belongsTo(GachaItem::class);
    }
}
