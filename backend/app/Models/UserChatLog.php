<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserChatLog extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'event_id', 'room_id'];

    // update_at は不要なので無効化
    public $timestamps = false;

    // created_at は自動で入れたいので boot で設定または $timestamps=trueにしてupdated_atだけ外すなど
    // 今回はシンプルに timestamps = false にして手動またはDBデフォルトに任せます
    // が、Laravel標準に合わせるなら以下推奨

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->created_at = $model->freshTimestamp();
        });
    }
}
