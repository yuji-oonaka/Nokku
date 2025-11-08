<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    // ↓↓↓ このブロックを追記・または編集 ↓↓↓
    protected $fillable = [
        'name',
        'email',
        'firebase_uid', // FirebaseのUID
        'role',         // 権限 (もしあれば)
    ];
    // ↑↑↑ このブロックを追記・または編集 ↑↑↑
    /**
     * このユーザーが持つ購入済みチケット（UserTicket）を取得 (1対多)
     */
    public function userTickets()
    {
        return $this->hasMany(UserTicket::class);
    }

    public function posts(): HasMany // 2. メソッド追加
    {
        return $this->hasMany(Post::class);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}