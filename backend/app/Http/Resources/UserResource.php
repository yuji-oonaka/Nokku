<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nickname' => $this->nickname,
            'image_url' => $this->image_url,
            // ★追加: せっかく実装したBioもここで返します
            'bio' => $this->bio,
            'role' => $this->role,
        ];
    }
}
