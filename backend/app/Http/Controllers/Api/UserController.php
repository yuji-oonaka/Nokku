<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\User\UpdateUserRequest; // 作成したFormRequestをインポート

class UserController extends Controller
{
    /**
     * 認証済みユーザーのプロフィール情報を取得 (show)
     */
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * 認証済みユーザーのプロフィール情報を更新 (update)
     */
    public function update(UpdateUserRequest $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // 1. バリデーション済みのデータを取得
        // (UpdateUserRequestですでにチェック済み)
        $validatedData = $request->validated();

        // 2. 【ビジネスロジック】アーティスト以外は画像URLを除外する
        // クライアント側で誤って送ってきた場合や、不正なリクエストへの対策
        if ($user->role !== 'artist') {
            unset($validatedData['image_url']);
        }

        // 3. 更新実行
        $user->update($validatedData);

        return response()->json($user);
    }
}
