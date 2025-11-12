<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        // 'name', // 👈 削除
        'real_name',  // 👈 'name' の代わりに追加 (本名)
        'nickname',   // 👈 追加 (公開名)
        'email',
        'firebase_uid',
        'role',
        'password', // 👈 UserSeeder で使っているので fillable に必要
    ];
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
     * このアーティストが作成したイベント (1対多)
     */
    public function events(): HasMany
    {
        // 'artist_id' カラムで Event と紐付け
        return $this->hasMany(Event::class, 'artist_id');
    }

    /**
     * このアーティストが作成したグッズ (1対多)
     */
    public function products(): HasMany
    {
        // 'artist_id' カラムで Product と紐付け
        return $this->hasMany(Product::class, 'artist_id');
    }

    /**
     * このユーザーがフォローしているアーティスト (多対多)
     */
    public function following(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,     // 関連するモデル (User)
            'follows',       // 中間テーブル名
            'user_id',       // 中間テーブルの「自分」の外部キー
            'artist_id'    // 中間テーブルの「相手」の外部キー
        );
    }

    /**
     * このアーティストをフォローしているユーザー (ファン) (多対多)
     */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'follows',
            'artist_id',   // 「自分」の外部キー (自分がアーティスト側)
            'user_id'      // 「相手」の外部キー (相手がファン側)
        );
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