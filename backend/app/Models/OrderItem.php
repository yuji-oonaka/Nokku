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
     * NOKKU憲法: 商品とチケットの排他バリデーション
     */
    protected static function booted()
    {
        static::saving(function ($item) {
            $hasProduct = !empty($item->product_id);
            $hasTicket = !empty($item->ticket_type_id);

            // 商品とチケットのいずれか一方が必須
            if ($hasProduct && $hasTicket) {
                throw new \LogicException('OrderItemは「商品」か「チケット」のいずれか一方でなければなりません。');
            }
            if (!$hasProduct && !$hasTicket) {
                throw new \LogicException('OrderItemには「商品」または「チケット」の指定が必須です。');
            }
        });
    }

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

    /**
     * ★追加: チケット種別へのリレーション
     */
    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }
}
