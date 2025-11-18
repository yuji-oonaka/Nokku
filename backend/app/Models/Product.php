<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
// 1. ★ 2つを use
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

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

    // 2. ★ このメソッドを追加
    /**
     * image_url 属性 (アクセサ)
     *
     * DBから 'image_url' を取得した際に、
     * 自動でフルURL (Storage::url()) に変換する。
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            // get: fn($value) => $value ? Storage::url($value) : null, // 👈 この行を削除

            // 1. ★ get 処理を {} を使う書き方(クロージャ)に変更
            get: function ($value) {
                // 2. ★ $value (DBの値) が null なら、null を返す
                if (!$value) {
                    return null;
                }

                // 3. ★ Storage::url() でパス (/storage/...) を取得し、
                //    asset() でホスト (http://10.0.2.2) を付け足す
                return asset(Storage::url($value));
            }
        );
    }
}
