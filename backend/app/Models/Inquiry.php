<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // ★ 1. インポート

class Inquiry extends Model
{
    use HasFactory;

    // ★ 2. 登録を許可するカラム
    protected $fillable = [
        'user_id',
        'subject',
        'message',
        // 'status' はユーザーが設定するものではないので $fillable に含めない
    ];

    /**
     * このお問い合わせを送信したユーザーを取得 (多対1)
     */
    public function user(): BelongsTo // ★ 3. メソッド追加
    {
        return $this->belongsTo(User::class);
    }
}