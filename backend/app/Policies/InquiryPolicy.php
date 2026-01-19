<?php

namespace App\Policies;

use App\Models\Inquiry;
use App\Models\User;

class InquiryPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // ★ここが重要: Operatorを許可リストに入れる
        return in_array($user->role, ['admin', 'operator']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Inquiry $inquiry): bool
    {
        return in_array($user->role, ['admin', 'operator']);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // 作成はアプリ側(User)で行うため、管理画面からは作成不要かもしれないが、
        // テスト用にAdminは許可しておくと便利
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Inquiry $inquiry): bool
    {
        // 返信ステータス変更などで更新権限が必要
        return in_array($user->role, ['admin', 'operator']);
    }

    // delete等は admin のみでもOK
    public function delete(User $user, Inquiry $inquiry): bool
    {
        return $user->role === 'admin';
    }
}
