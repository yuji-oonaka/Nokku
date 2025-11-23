<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'real_name',
        'nickname',
        'email',
        'firebase_uid',
        'role',      // 'admin', 'artist', 'user'
        'password',
        'phone_number',
        'postal_code',
        'prefecture',
        'city',
        'address_line1',
        'address_line2',
        'image_url',
        'avatar',    // 念のため残しておく
        'bio',       // 念のため残しておく
    ];

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

    /*
    |--------------------------------------------------------------------------
    | リレーション定義
    |--------------------------------------------------------------------------
    */

    /**
     * このユーザーが持つ購入済みチケット（UserTicket）を取得 (1対多)
     * ★ これで UserTicketController のエラーが解消されます
     */
    public function userTickets()
    {
        return $this->hasMany(UserTicket::class);
    }

    /**
     * ユーザーが投稿したお知らせ
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    /**
     * このアーティストが作成したイベント (1対多)
     */
    public function events(): HasMany
    {
        // DBのカラム名が artist_id の場合はこちら
        return $this->hasMany(Event::class, 'artist_id');

        // ※もし events テーブルが user_id を使っている場合は以下になります
        // return $this->hasMany(Event::class, 'user_id');
    }

    /**
     * このアーティストが作成したグッズ (1対多)
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'artist_id');
    }

    /**
     * このユーザーがフォローしているアーティスト (多対多)
     */
    public function following(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'follows',
            'user_id',
            'artist_id'
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
            'artist_id',
            'user_id'
        );
    }

    /**
     * お気に入りしたグッズ (Productとの多対多)
     */
    public function favorites()
    {
        return $this->belongsToMany(Product::class, 'favorites', 'user_id', 'product_id')
            ->withTimestamps();
    }

    /*
    |--------------------------------------------------------------------------
    | アクセサ
    |--------------------------------------------------------------------------
    */

    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                if (str_starts_with($value, 'http')) return $value;
                return asset(Storage::url($value));
            }
        );
    }
}
