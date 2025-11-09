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
        // (email は Firebase 側で管理するため、ここでは name のみ)
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            // 必要に応じて 'avatar_url' などを追加
        ]);

        // 2. ユーザー情報を更新
        $user->update([
            'name' => $validated['name'],
        ]);

        // 3. 更新後のユーザー情報を返す
        return response()->json($user);
    }
}