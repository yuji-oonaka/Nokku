<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // 1. インポート

class Post extends Model
{
    use HasFactory;

    // 2. 登録を許可するカラム
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'image_url',
    ];

    /**
     * この投稿を所有するユーザーを取得
     */
    public function user(): BelongsTo // 3. メソッド追加
    {
        return $this->belongsTo(User::class);
    }
}