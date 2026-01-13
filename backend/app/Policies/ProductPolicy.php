<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Determine whether the user can view any models.
     * 一覧は誰でも見れる (Controller側で公開範囲制御していないためtrue)
     */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     * 詳細も誰でも見れる
     */
    public function view(?User $user, Product $product): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     * アーティスト または 管理者のみ
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['artist', 'admin']);
    }

    /**
     * Determine whether the user can update the model.
     * 管理者 または (アーティストかつ自分の商品)
     */
    public function update(User $user, Product $product): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        return $user->role === 'artist' && $product->artist_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     * 管理者 または (アーティストかつ自分の商品)
     */
    public function delete(User $user, Product $product): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        return $user->role === 'artist' && $product->artist_id === $user->id;
    }
}
