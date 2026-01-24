<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProfileItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'image_url',
        'rarity',
        'is_default',
    ];

    // Consts for types
    public const TYPE_ICON = 'icon';
    public const TYPE_FRAME = 'frame';
    public const TYPE_BACKGROUND = 'background';

    /**
     * ★追加: 画像URLのアクセサ
     * DBから取得したとき、自動的に http://... 付きのフルURLに変換します
     */
    public function getImageUrlAttribute($value)
    {
        if (!$value) return null;

        // すでに http から始まる完全なURLならそのまま返す
        if (str_starts_with($value, 'http')) {
            return $value;
        }

        // そうでなければ、storageフォルダへのURLとして生成する
        // 例: 'gacha_items/pig.jpg' -> 'http://192.168.x.x/storage/gacha_items/pig.jpg'
        return asset('storage/' . $value);
    }

    /**
     * このアイテムが含まれているガチャ一覧（逆引き用）
     */
    public function gachas()
    {
        return $this->belongsToMany(Gacha::class, 'gacha_profile_item')
            ->withPivot('weight')
            ->withTimestamps();
    }
}
