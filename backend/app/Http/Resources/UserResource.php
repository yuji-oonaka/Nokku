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
            // モデルのアクセサ(imageUrl)が効くので、そのまま渡せばOK
            'image_url' => $this->image_url,
            'bio' => $this->bio,
            'role' => $this->role,
            // 必要な情報があればここに追加
        ];
    }
}
