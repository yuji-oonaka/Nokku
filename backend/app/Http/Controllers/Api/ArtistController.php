<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User; // 1. ★ User モデルを use
use Illuminate\Support\Facades\Auth; // 2. ★ Auth を use

class ArtistController extends Controller
{
    /**
     * アーティスト一覧を取得
     */
    public function index()
    {
        // 1. ログイン中のユーザーを取得
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 2. 'role' が 'artist' のユーザーのみを取得
        //    (自分自身は一覧から除外する)
        $artists = User::where('role', 'artist')
                       ->where('id', '!=', $user->id) 
                       ->get();

        // 3. ログイン中のユーザーがフォローしているアーティストのIDリストを取得
        //    pluck('id') で ID の配列を [1, 5, 12] のような形で取得
        $followingIds = $user->following()->pluck('id');

        // 4. 2つの情報を JSON で返す
        return response()->json([
            'artists' => $artists,
            'following_ids' => $followingIds,
        ]);
    }

    /**
     * アーティストをフォローする
     * (引数の $artist は、User モデルから自動で解決されます)
     */
    public function follow(User $artist)
    {
        // 1. ログイン中のユーザーを取得
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 2. 自分自身や、アーティスト以外はフォローさせない (念のため)
        if ($user->id === $artist->id || $artist->role !== 'artist') {
            return response()->json(['message' => '不正な操作です'], 422);
        }

        // 3. User モデルで定義した 'following' リレーションを使って紐付け
        // attach() は、中間テーブル (follows) にレコードを追加します
        $user->following()->attach($artist->id);

        return response()->json(['message' => 'アーティストをフォローしました'], 200);
    }

    /**
     * アーティストをアンフォローする
     */
    public function unfollow(User $artist)
    {
        // 1. ログイン中のユーザーを取得
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 'following' リレーションを使って紐付けを解除
        // detach() は、中間テーブル (follows) からレコードを削除します
        $user->following()->detach($artist->id);

        return response()->json(['message' => 'アーティストのフォローを解除しました'], 200);
    }

    /**
     * 特定のアーティストの詳細情報を取得 (プロフィールページ用)
     *
     * @param \App\Models\User $artist (ルートモデルバインディングにより自動で User が $artist に注入される)
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(User $artist)
    {
        // 1. 指定されたユーザーが 'artist' ロールか確認
        if ($artist->role !== 'artist') {
            return response()->json(['message' => '指定されたユーザーはアーティストではありません'], 404);
        }

        // 2. アーティスト情報と関連情報を Eager Loading で取得
        //    (N+1問題を回避するため with() を使用)
        //    お知らせ(posts)、イベント(events)、グッズ(products) を読み込む
        $artistData = $artist->load([
            // 投稿: 作成日時が新しい順で取得
            'posts' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            // イベント: 開催日が新しい順で取得 (※'event_date' カラムを想定)
            // (カラム名が違う場合は修正してください)
            'events' => function ($query) {
                $query->orderBy('event_date', 'desc');
            },
            // グッズ: 作成日時が新しい順で取得
            'products' => function ($query) {
                $query->orderBy('created_at', 'desc');
            }
        ]);

        // 3. 必要な情報だけをJSONで返す
        // (real_name などの非公開情報がフロントに渡らないよう注意)
        return response()->json([
            'id' => $artistData->id,
            'nickname' => $artistData->nickname,
            'profile_image_url' => $artistData->profile_image_url, // (もしあれば)
            'bio' => $artistData->bio, // (もしあれば)

            // 関連情報
            'posts' => $artistData->posts,
            'events' => $artistData->events,
            'products' => $artistData->products,
        ]);
    }
}