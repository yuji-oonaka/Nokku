<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
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
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 1. バリデーション
        $validatedData = $request->validate([
            'real_name' => 'required|string|max:255',
            'nickname' => [
                'required',
                'string',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'phone_number' => 'nullable|string|max:20',
            'postal_code' => 'nullable|string|max:8',
            'prefecture' => 'nullable|string|max:10',
            'city' => 'nullable|string|max:50',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'image_url' => 'nullable|string',
        ]);

        // 2. ★ 修正: 変数名を $validatedData に統一
        // アーティスト以外が画像を送ってきたら、保存対象から削除する
        if (isset($validatedData['image_url']) && $user->role !== 'artist') {
            unset($validatedData['image_url']);
        }

        // 3. 更新
        $user->update($validatedData);

        return response()->json($user);
    }
}
