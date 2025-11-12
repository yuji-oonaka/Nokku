<?php
// ファイル名: app/Models/OrderItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo; // 1. ★ BelongsTo を use

class OrderItem extends Model
{
    use HasFactory;

    /**
     * 一括代入（Mass Assignment）から保護する属性
     */
    protected $guarded = ['id'];

    /**
     * このアイテムが属する注文 (Orderモデルとのリレーション)
     * (多対1: 多くのアイテムは、1つの注文に属する)
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * このアイテムに対応する商品 (Productモデルとのリレーション)
     * (多対1: 多くのアイテムは、1つの商品に紐付く)
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // ★ 補足 ★
    // order_items テーブルには 'product_name' や 'price_at_purchase' 
    // というカラムも持たせているため、
    // もし紐付いた Product が削除されても ($this->product が null になっても)、
    // 注文履歴には名前と価格を表示し続けることができます。
}
