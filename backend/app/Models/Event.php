<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Storage;
use App\Models\User;


class Event extends Model
{
    use HasFactory;

    // ↓↓↓ この行を追記 ↓↓↓
    protected $fillable = [
        'title',
        'description',
        'venue',
        'event_date',
        'artist_id',
        'image_url',
    ];

    public function artist()
    {
        // artist_id カラムを使って User モデルと紐付ける
        return $this->belongsTo(User::class, 'artist_id');
    }

    /**
     * このイベントが持つ券種（TicketType）を取得 (1対多)
     */
    public function ticketTypes()
    {
        return $this->hasMany(TicketType::class);
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) return null;
                // httpから始まっていればそのまま、そうでなければStorageのURLに変換
                if (str_starts_with($value, 'http')) return $value;
                return asset(Storage::url($value));
            }
        );
    }
}