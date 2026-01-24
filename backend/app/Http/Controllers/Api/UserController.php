<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\User\UpdateUserRequest;

class UserController extends Controller
{
    /**
     * 認証済みユーザーのプロフィール情報を取得 (show)
     */
    public function show(Request $request)
    {
        // ★ここを元の形に戻します。
        // リレーションの load はあっても邪魔にならないので、念のため残しておきます。
        // (これを消しても動きますが、残しておくと後でガチャ対応するときに役立ちます)
        $user = $request->user()->load(['currentIcon', 'currentFrame', 'currentBackground']);

        // Resourceを使わず、Laravelの標準機能でJSONにします。
        // これなら Bio も Image も、DBにあるものは全て確実に表示されます。
        return response()->json($user);
    }

    /**
     * 認証済みユーザーのプロフィール情報を更新 (update)
     */
    public function update(UpdateUserRequest $request)
    {
        $user = $request->user();
        $validatedData = $request->validated();

        // ★「Userは画像アップロード禁止」のロジックも、とりあえず復活させておきます
        // これで既存の挙動は保証されます。
        if ($user->role !== 'artist' && $user->role !== 'admin') {
            unset($validatedData['image_url']);
        }

        $user->update($validatedData);

        // 更新後も、Resourceを使わずそのまま返します
        $user->load(['currentIcon', 'currentFrame', 'currentBackground']);
        return response()->json($user);
    }

    /**
     * ユーザーの所持アイテム一覧を取得
     */
    public function items(Request $request)
    {
        // 中間テーブル(user_profile_items)の取得日(obtained_at)も一緒に取得
        // 新しく手に入れた順（降順）で返します
        $items = $request->user()
            ->profileItems()
            ->withPivot('obtained_at')
            ->orderBy('pivot_obtained_at', 'desc')
            ->get();

        return response()->json([
            'items' => $items
        ]);
    }

    /**
     * ★追加: アイコンのみを即座に変更するAPI
     */
    public function updateIcon(Request $request)
    {
        // 1. バリデーション: IDが送られてきているか、数字か、DBに存在するか
        $request->validate([
            'current_icon_id' => 'required|integer|exists:profile_items,id',
        ]);

        $user = $request->user();
        $iconId = $request->input('current_icon_id');

        // 2. 所持チェック: 本当にそのアイテムを持っているか？（不正防止）
        // user_profile_items テーブルを確認
        if (!$user->profileItems()->where('profile_item_id', $iconId)->exists()) {
            return response()->json(['message' => '所持していないアイテムです。'], 403);
        }

        // 3. 更新実行: ユーザーのアイコンIDを書き換え
        $user->current_icon_id = $iconId;
        $user->save();

        $user->refresh();

        // 4. 最新のユーザー情報を返す（これでアプリ側の表示も更新されます）
        // リレーションをロードして、最新の画像URLなどが取れるようにする
        $user->load(['currentIcon', 'currentFrame', 'currentBackground']);

        return response()->json($user);
    }
}
