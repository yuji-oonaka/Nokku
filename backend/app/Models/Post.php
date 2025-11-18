<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// 1. ★ 2つを use
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class Post extends Model
{
    use HasFactory;

    // 2. 登録を許可するカラム
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'image_url',
        'publish_at',
        'expires_at',
    ];

    /**
     * 3. ★ (NEW) 型キャストの定義
     * これら
     */
    protected $casts = [
        'publish_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * この投稿を所有するユーザーを取得
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // 4. ★★★ (NEW) Product.php と同じアクセサを追加 ★★★
    /**
     * image_url 属性 (アクセサ)
     *
     * DBから 'image_url' を取得した際に、
     * 自動でフルURL (Storage::url()) に変換する。
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
                }
                return asset(Storage::url($value));
            }
        );
    }
}
