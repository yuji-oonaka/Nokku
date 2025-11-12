<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // 1. Auth を use
use App\Models\User; // 2. User モデルを use

class UserController extends Controller
{
    /**
     * 認証済みユーザーのプロフィール情報を取得 (show)
     */
    public function show(Request $request)
    {
        // Auth::user() で認証済みユーザーのモデルが取得できる
        $user = Auth::user();

        return response()->json($user);
    }

    /**
     * 認証済みユーザーのプロフィール情報を更新 (update)
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        // 1. バリデーション
        $validated = $request->validate([
            // 'name' => 'required|string|max:255', // 👈 削除
            'real_name' => 'required|string|max:255', // 👈 'real_name' に変更
            'nickname' => [ // 👈 'nickname' に変更
                'required',
                'string',
                'max:255',
                // 2. ★ ニックネームの重複チェック (自分自身を除く)
                Rule::unique('users', 'nickname')->ignore($user->id),
            ],
        ]);

        // 3. ユーザー情報を更新
        $user->update([
            'real_name' => $validated['real_name'], // 👈 変更
            'nickname' => $validated['nickname'], // 👈 変更
        ]);

        return response()->json($user);
    }
}