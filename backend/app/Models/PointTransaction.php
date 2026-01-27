<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'balance_after', // 追加
        'type',
        'status',        // 追加
        'error_code',    // 追加
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    // 定数管理
    public const TYPE_CHAT_MESSAGE = 'chat_message';
    public const TYPE_ROOM_CREATE = 'room_create';

    // ★ 修正・追加部分
    public const TYPE_GACHA = 'gacha';           // ガチャを回す（消費）
    public const TYPE_GACHA_REFUND = 'gacha_refund'; // ★追加: ダブり時のポイント還元

    public const TYPE_DONATION = 'donation';
    public const TYPE_BONUS = 'bonus';
    public const TYPE_LOGIN_BONUS = 'login_bonus';
    public const TYPE_SUBSCRIPTION = 'subscription';

    // ステータス定数
    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED  = 'failed';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
