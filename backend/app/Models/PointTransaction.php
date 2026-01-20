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
        'type',        // ★復活
        'description',
        'metadata',    // ★追加
    ];

    protected $casts = [
        'metadata' => 'array', // JSONを配列として扱う
    ];

    // 定数管理（将来増えるガチャや寄付もここに追記）
    public const TYPE_CHAT_MESSAGE = 'chat_message';
    public const TYPE_ROOM_CREATE = 'room_create';
    public const TYPE_GACHA = 'gacha';       // 将来用
    public const TYPE_DONATION = 'donation'; // 将来用
    public const TYPE_BONUS = 'bonus';
    public const TYPE_LOGIN_BONUS = 'login_bonus';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
