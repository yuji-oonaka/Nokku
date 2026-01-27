<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserChatLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'event_id',
        'room_id',
        'status',
        'error_code',
        'is_free',
        'consumed_points'
    ];

    // ステータス定数
    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED = 'failed';

    // 標準の timestamps を有効化 (updated_at も追加したため)
    public $timestamps = true;
}
