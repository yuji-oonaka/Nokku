<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => (int) $this->price,
            'stock' => (int) $this->stock,
            'limit_per_user' => $this->limit_per_user,
            'image_url' => $this->image_url, // モデル側のアクセサ(http判定)が効きます

            // ★ アーティスト情報 (N+1対策: ロードされている場合のみ安全な形式で展開)
            'artist' => new UserResource($this->whenLoaded('artist')),

            // ★ 追加属性
            'likes_count' => (int) ($this->likes_count ?? 0),
            'is_liked' => (bool) ($this->is_liked ?? false),

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
