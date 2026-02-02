<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany; // 1. インポートを追加

class Gacha extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'consumption_point',
        'refund_rate',
        'start_at',
        'end_at',
        'is_active',
    ];

    protected $casts = [
        'refund_rate' => 'decimal:2',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * 排出アイテム設定
     * belongsToMany から HasMany(GachaItem::class) に変更
     */
    public function items(): HasMany
    {
        // 修正：gacha_items テーブルを管理する GachaItem モデルと紐付ける
        return $this->hasMany(GachaItem::class);
    }

    // 有効なガチャのみ取得するスコープ（ここは変更なし）
    public function scopeActive(Builder $query)
    {
        $now = now();
        return $query->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('start_at')->orWhere('start_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('end_at')->orWhere('end_at', '>=', $now);
            });
    }
}
