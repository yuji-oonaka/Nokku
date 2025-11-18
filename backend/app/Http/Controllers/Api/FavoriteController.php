<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;


class FavoriteController extends Controller
{
    /**
     * お気に入りの トグル処理 (登録 <-> 解除)
     */
    public function toggle(Product $product)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 既にいいねしているか確認
        // toggle() メソッドを使うと、あれば削除、なければ追加を自動でやってくれます！
        $result = $user->favorites()->toggle($product->id);

        // $result['attached'] にIDが入っていれば「追加された（いいね）」
        // $result['detached'] にIDが入っていれば「削除された（解除）」
        $isLiked = count($result['attached']) > 0;

        return response()->json([
            'message' => $isLiked ? 'お気に入りに追加しました' : 'お気に入りを解除しました',
            'is_liked' => $isLiked,
        ]);
    }

    /**
     * 自分の「お気に入り済みグッズ」一覧を取得
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 中間テーブル経由でグッズを取得
        $products = $user->favorites()
            ->withCount('favoritedBy as likes_count') // ★ ここでカウントを追加
            ->orderByPivot('created_at', 'desc')      // 自分が「いいね」した順
            ->get();

        return response()->json($products);
    }
}
