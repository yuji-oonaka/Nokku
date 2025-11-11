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
        $user = Auth::user();

        // 'following' リレーションを使って紐付けを解除
        // detach() は、中間テーブル (follows) からレコードを削除します
        $user->following()->detach($artist->id);

        return response()->json(['message' => 'アーティストのフォローを解除しました'], 200);
    }
}