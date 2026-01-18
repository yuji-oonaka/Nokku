<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;

class Inquiry extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',          // 通報者
        'target_type',      // 対象モデル
        'target_id',        // 対象ID
        'organizer_id',     // 対応責任者
        'subject',
        'message',
        'status',           // open, in_review, closed
        'is_escalated',
        'escalation_reason',
        'handled_at',
        'closed_at',
        'expires_at',
    ];

    protected $casts = [
        'is_escalated' => 'boolean',
        'handled_at' => 'datetime',
        'closed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * 通報者を取得
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * 対応責任者（主催者）を取得
     */
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    /**
     * 通報対象（ユーザー、イベントなど）を取得
     */
    public function target(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'target_type', 'target_id');
    }

    // ★追加: 返信履歴
    public function responses()
    {
        return $this->hasMany(InquiryResponse::class);
    }

    // --- Scopes ---

    /**
     * 未解決の案件 (closed以外)
     */
    public function scopeOpen(Builder $query): void
    {
        $query->where('status', '!=', 'closed');
    }

    /**
     * エスカレーションされた案件（運営対応が必要）
     */
    public function scopeEscalated(Builder $query): void
    {
        $query->where('is_escalated', true);
    }
}
