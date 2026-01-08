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

        // 2. クエリの準備
        // ★ selectを追加し、passwordやemailなどの個人情報を除外して軽量化
        $query = User::where('role', 'artist')
            ->where('id', '!=', $user->id)
            ->select('id', 'nickname', 'image_url');

        // 3. 検索キーワードがあれば絞り込み
        if ($request->has('search') && $request->filled('search')) {
            $search = $request->input('search');
            $query->where('nickname', 'LIKE', "%{$search}%");
        }

        // 4. 実行
        // ★ limit(50) を追加し、全件取得によるサーバー負荷を回避
        $artists = $query->limit(50)->get();

        // 5. フォロー中のIDリストを取得
        $followingIds = $user->following()->pluck('id');

        return response()->json([
            'artists' => $artists,
            'following_ids' => $followingIds,
        ]);
    }

    /**
     * アーティストをフォローする (変更なし)
     */
    public function follow(User $artist)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if ($user->id === $artist->id || $artist->role !== 'artist') {
            return response()->json(['message' => '不正な操作です'], 422);
        }

        $user->following()->syncWithoutDetaching([$artist->id]); // attachより安全

        return response()->json(['message' => 'アーティストをフォローしました'], 200);
    }

    /**
     * アーティストをアンフォローする (変更なし)
     */
    public function unfollow(User $artist)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->following()->detach($artist->id);

        return response()->json(['message' => 'アーティストのフォローを解除しました'], 200);
    }

    /**
     * アーティスト詳細
     * リレーションの取得件数を制限してパフォーマンスを保護
     */
    public function show(User $artist)
    {
        if ($artist->role !== 'artist') {
            return response()->json(['message' => '指定されたユーザーはアーティストではありません'], 404);
        }

        // ★ リレーション取得時に件数制限 (take) を追加
        // これにより、投稿が1000件あっても最新の数件しか取得せず、高速に表示できます
        $artistData = $artist->load([
            'posts' => function ($query) {
                $query->latest()->take(10); // 最新10件
            },
            'events' => function ($query) {
                // イベントは開催日が重要ですが、元の仕様(desc)を維持しつつ制限
                $query->orderBy('event_date', 'desc')->take(5);
            },
            'products' => function ($query) {
                $query->latest()->take(8); // 最新8件
            }
        ]);

        return response()->json([
            'id' => $artistData->id,
            'nickname' => $artistData->nickname,
            'image_url' => $artistData->image_url,
            'posts' => $artistData->posts,
            'events' => $artistData->events,
            'products' => $artistData->products,
        ]);
    }
}
