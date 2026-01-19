<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // ★修正: AdminとArtistのみ閲覧可能 (Operatorは除外)
        return in_array($user->role, ['admin', 'artist']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        // Adminは誰でも見れる
        if ($user->role === 'admin') return true;

        // Artistは自分か、自分のスタッフだけ見れる
        if ($user->role === 'artist') {
            return $user->id === $model->id || $model->employer_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // AdminとArtistのみ作成可能
        return in_array($user->role, ['admin', 'artist']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        // AdminはOK
        if ($user->role === 'admin') return true;

        // Artistは自分か、自分のスタッフだけ編集可能
        if ($user->role === 'artist') {
            return $user->id === $model->id || $model->employer_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // AdminはOK
        if ($user->role === 'admin') return true;

        // Artistは自分のスタッフなら削除(解雇)可能
        if ($user->role === 'artist') {
            return $model->employer_id === $user->id;
        }

        return false;
    }
}
