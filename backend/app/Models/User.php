<?php

namespace App\Models;

// ▼ 基本的なインポート
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;

// ▼ Filament用のインポート
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName; // ★これが重要でした
use Filament\Panel;

// ▼ implements に HasName を追加
class User extends Authenticatable implements FilamentUser, HasName
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
        'role',
        'password',
        'phone_number',
        'postal_code',
        'prefecture',
        'city',
        'address_line1',
        'address_line2',
        'image_url',
        'avatar',
        'bio',
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
    | Filament用の設定
    |--------------------------------------------------------------------------
    */

    public function canAccessPanel(Panel $panel): bool
    {
        // 修正: admin または artist ならOKにする
        return in_array($this->role, ['admin', 'artist']);
    }

    // HasNameインターフェースを実装したので、Filamentはこのメソッドを使ってくれるようになります
    public function getFilamentName(): string
    {
        return (string) ($this->real_name ?? $this->nickname ?? $this->email);
    }

    /*
    |--------------------------------------------------------------------------
    | リレーション定義
    |--------------------------------------------------------------------------
    */
    public function userTickets()
    {
        return $this->hasMany(UserTicket::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'artist_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'artist_id');
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'user_id', 'artist_id');
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'artist_id', 'user_id');
    }

    public function favorites()
    {
        return $this->belongsToMany(Product::class, 'favorites', 'user_id', 'product_id')->withTimestamps();
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
