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
use Jeffgreco13\FilamentBreezy\Traits\TwoFactorAuthenticatable;
// ▼ Filament用のインポート
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Panel;
// ▼ 追加インポート
use App\Models\PointTransaction;

class User extends Authenticatable implements FilamentUser, HasName
{
    use HasApiTokens, HasFactory, Notifiable;
    use TwoFactorAuthenticatable;

    protected $fillable = [
        'real_name',
        'nickname',
        'email',
        'firebase_uid',
        'role',
        'employer_id',
        'points',
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

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'points' => 'integer', // ★追加
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Filament用の設定
    |--------------------------------------------------------------------------
    */
    public function canAccessPanel(Panel $panel): bool
    {
        // 修正: staff も管理画面に入れるならここに追加が必要ですが、現状維持
        return in_array($this->role, ['admin', 'artist', 'operator']);
    }

    public function getFilamentName(): string
    {
        return (string) ($this->real_name ?? $this->nickname ?? $this->email);
    }

    /*
    |--------------------------------------------------------------------------
    | リレーション定義
    |--------------------------------------------------------------------------
    */

    // ★追加: ポイント履歴
    public function pointTransactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class)->latest();
    }

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

    public function inquiries(): HasMany
    {
        return $this->hasMany(Inquiry::class);
    }

    //追加: 自分が雇っているスタッフたち
    public function staff()
    {
        return $this->hasMany(User::class, 'employer_id');
    }

    //自分の雇用主（アーティスト）
    public function employer()
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    /*
    |--------------------------------------------------------------------------
    | アクセサ・ヘルパー
    |--------------------------------------------------------------------------
    */

    // ★追加: 権限チェック用
    public function isStaff(): bool
    {
        return in_array($this->role, ['staff', 'admin']);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isArtist(): bool
    {
        return $this->role === 'artist';
    }

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
