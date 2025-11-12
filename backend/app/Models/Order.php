<?php
// ファイル名: app/Models/Order.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // 1. ★ BelongsTo を use
use Illuminate\Database\Eloquent\Relations\HasMany; // 2. ★ HasMany を use

class Order extends Model
{
    use HasFactory;

    /**
     * 一括代入（Mass Assignment）から保護する属性
     *
     * ( $fillable ではなく $guarded を使うと、
     * 「id以外はすべて許可」という意味になり、記述が楽です )
     */
    protected $guarded = ['id'];

    /**
     * JSONにキャストする属性
     * (shipping_address カラムを自動で配列/JSONに変換します)
     */
    protected $casts = [
        'shipping_address' => 'array',
    ];

    /**
     * この注文を行ったユーザー (Userモデルとのリレーション)
     * (多対1: 多くの注文は、1人のユーザーに属する)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * この注文に含まれる商品アイテム (OrderItemモデルとのリレーション)
     * (1対多: 1つの注文は、多くのアイテムを持つ)
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
