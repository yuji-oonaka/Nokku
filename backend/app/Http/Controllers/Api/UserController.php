<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // 1. Auth を use
use App\Models\User; // 2. User モデルを use
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * 認証済みユーザーのプロフィール情報を取得 (show)
     */
    public function show(Request $request)
    {
        $user = Auth::user();

        return response()->json($user);
    }

    /**
     * 認証済みユーザーのプロフィール情報を更新 (update)
     */
    public function update(Request $request)
    {
        /** @var \App\Models\User $user */ //
        $user = Auth::user(); // 現在ログイン中のユーザーを取得

        // 2. ★ バリデーションルールを定義します
        $validatedData = $request->validate([
            'real_name' => 'required|string|max:255',
            'nickname' => [
                'required',
                'string',
                'max:255',
                // ニックネームが重複していないかチェック
                // (ただし、自分自身のIDは重複チェックの対象から除外する)
                Rule::unique('users')->ignore($user->id),
            ],

            // 3. ★ 住所フィールドのバリデーション (すべて任意)
            // 'nullable' = 空でもOK
            'phone_number' => 'nullable|string|max:20',
            'postal_code' => 'nullable|string|max:8', // '123-4567' を許容
            'prefecture' => 'nullable|string|max:10',
            'city' => 'nullable|string|max:50',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
        ]);

        // 4. ★ バリデーションが通ったデータで、ユーザー情報を更新
        $user->update($validatedData);

        // 5. ★ 更新後の最新のユーザー情報をアプリに返す
        return response()->json($user);
    }
}