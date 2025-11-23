<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'stock',
        'image_url',
        'artist_id',
    ];

    /**
     * image_url 属性 (アクセサ)
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
                }

                // ★ 修正: http から始まるURL（ダミーデータや外部画像）の場合はそのまま返す
                if (str_starts_with($value, 'http')) {
                    return $value;
                }

                // アップロードされた画像（ローカルパス）の場合はURLに変換する
                return asset(Storage::url($value));
            }
        );
    }

    /**
     * リレーション: 作成者（アーティスト）
     * ★★★ これが抜けていたのが原因です！ ★★★
     */
    public function artist()
    {
        // products テーブルの artist_id は users テーブルの id に紐づく
        return $this->belongsTo(User::class, 'artist_id');
    }

    /**
     * このグッズを「お気に入り」に入れているユーザーたち
     */
    public function favoritedBy()
    {
        return $this->belongsToMany(User::class, 'favorites', 'product_id', 'user_id')
            ->withTimestamps();
    }

    /**
     * アクセサ: 現在ログインしているユーザーが、この商品を「いいね」しているか？
     */
    protected $appends = ['is_liked'];

    public function getIsLikedAttribute(): bool
    {
        if (!Auth::check()) {
            return false;
        }
        return $this->favoritedBy()->where('user_id', Auth::id())->exists();
    }
}
