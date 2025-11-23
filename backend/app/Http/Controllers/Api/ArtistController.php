<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ArtistController extends Controller
{
    /**
     * アーティスト一覧を取得 (検索機能付き)
     */
    public function index(Request $request)
    {
        // 1. ログイン中のユーザーを取得
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 2. クエリの準備 ('role' が 'artist' かつ、自分以外)
        $query = User::where('role', 'artist')
            ->where('id', '!=', $user->id);

        // 3. ★★★ (NEW) 検索キーワードがあれば絞り込み ★★★
        if ($request->has('search') && $request->filled('search')) {
            $search = $request->input('search');
            // ニックネームの部分一致検索 (LIKE)
            $query->where('nickname', 'LIKE', "%{$search}%");
        }

        // 4. 実行
        $artists = $query->get();

        // 5. フォロー中のIDリストを取得
        $followingIds = $user->following()->pluck('id');

        return response()->json([
            'artists' => $artists,
            'following_ids' => $followingIds,
        ]);
    }

    /**
     * アーティストをフォローする
     */
    public function follow(User $artist)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->id === $artist->id || $artist->role !== 'artist') {
            return response()->json(['message' => '不正な操作です'], 422);
        }

        $user->following()->attach($artist->id);

        return response()->json(['message' => 'アーティストをフォローしました'], 200);
    }

    /**
     * アーティストをアンフォローする
     */
    public function unfollow(User $artist)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->following()->detach($artist->id);

        return response()->json(['message' => 'アーティストのフォローを解除しました'], 200);
    }

    /**
     * アーティスト詳細 (変更なし)
     */
    public function show(User $artist)
    {
        if ($artist->role !== 'artist') {
            return response()->json(['message' => '指定されたユーザーはアーティストではありません'], 404);
        }

        $artistData = $artist->load([
            'posts' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'events' => function ($query) {
                $query->orderBy('event_date', 'desc');
            },
            'products' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        return response()->json([
            'id' => $artistData->id,
            'nickname' => $artistData->nickname,
            'image_url' => $artistData->image_url,
            'bio' => $artistData->bio,
            'posts' => $artistData->posts,
            'events' => $artistData->events,
            'products' => $artistData->products,
        ]);
    }
}
