<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;
use Carbon\Carbon;

class EventPolicy
{
    /**
     * 閲覧は誰でも可能
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'artist']);
    }

    /**
     * 詳細閲覧も誰でも可能
     */
    public function view(?User $user, Event $event): bool
    {
        return true;
    }

    /**
     * 作成: アーティストまたは管理者
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['artist', 'admin']);
    }

    /**
     * 更新:
     * 1. 所有者(アーティスト) または 管理者
     * 2. かつ、イベントが終了していないこと (管理者は特例で編集可能とするなら条件分岐を変える)
     */
    public function update(User $user, Event $event): bool
    {
        // まず権限チェック
        $isOwnerOrAdmin = ($user->role === 'admin') || ($user->role === 'artist' && $event->artist_id === $user->id);

        if (!$isOwnerOrAdmin) {
            return false;
        }

        // 管理者なら過去イベントでも編集可能とする(リカバリ対応等)
        if ($user->role === 'admin') {
            return true;
        }

        // アーティストは過去のイベントを編集できない
        return !Carbon::parse($event->event_date)->isPast();
    }

    /**
     * 削除: 所有者 または 管理者
     */
    public function delete(User $user, Event $event): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        return $user->role === 'artist' && $event->artist_id === $user->id;
    }
}
