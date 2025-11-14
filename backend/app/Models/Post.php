<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Post extends Model
{
    use HasFactory;

    // 2. 登録を許可するカラム
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'image_url',
        'publish_at', // 👈 ★ 1. 'publish_at' を追加
        'expires_at', // 👈 ★ 2. 'expires_at' を追加
    ];

    /**
     * 3. ★ (NEW) 型キャストの定義
     * これらのカラムを自動的に 'datetime' オブジェクトとして扱います
     */
    protected $casts = [
        'publish_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * この投稿を所有するユーザーを取得
     */
    public function user(): BelongsTo // 3. メソッド追加
    {
        return $this->belongsTo(User::class);
    }
}