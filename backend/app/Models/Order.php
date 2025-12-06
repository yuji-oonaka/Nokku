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

    /**
     * プラットフォーム手数料率 (10%)
     * 将来的にはconfigやDB設定から取得するように変更可能
     */
    const PLATFORM_FEE_PERCENTAGE = 0.10;

    /**
     * 手数料と受取額を計算して保存する
     * 呼び出しタイミング: 決済完了(Webhook)時など
     */
    public function calculateAndSaveCommission(): void
    {
        // 念のため数値型にキャストして計算
        $total = (float) $this->total_price;
        
        // 手数料計算 (切り捨て)
        $fee = floor($total * self::PLATFORM_FEE_PERCENTAGE);
        
        // 受取額計算
        $payout = $total - $fee;

        // 保存
        $this->platform_fee = $fee;
        $this->payout_amount = $payout;
        $this->save();
    }
}
