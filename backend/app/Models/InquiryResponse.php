<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InquiryResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'inquiry_id',
        'user_id',
        'is_admin',
        'body',
        'is_read',
    ];

    protected $casts = [
        'is_admin' => 'boolean',
        'is_read' => 'boolean',
    ];

    // 親の問い合わせ
    public function inquiry()
    {
        return $this->belongsTo(Inquiry::class);
    }

    // 送信者
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
