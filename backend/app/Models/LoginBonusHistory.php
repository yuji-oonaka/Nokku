<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoginBonusHistory extends Model
{
    use HasFactory;

    // 一括代入を許可するカラム
    protected $fillable = [
        'user_id',
        'points',
        'awarded_date',
    ];

    // 日付型として扱う（Carbonインスタンス化）
    protected $casts = [
        'awarded_date' => 'date',
    ];
}
