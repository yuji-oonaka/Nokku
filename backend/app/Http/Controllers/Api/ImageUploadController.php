<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    /**
     * 画像をアップロードし、保存パスとURLを返す (汎用版)
     */
    public function store(Request $request)
    {
        // 1. バリデーション
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
            // ★ 追加: 何の画像か指定させる (必須)
            'type'  => 'required|string|in:product,event,avatar,post',
        ]);

        // 2. 保存先フォルダの決定
        $folder = match ($request->type) {
            'product' => 'products',
            'event'   => 'events',
            'avatar'  => 'avatars',
            'post'    => 'posts', // 既存の投稿用
            default   => 'uploads',
        };

        // 3. 画像保存処理
        if ($request->hasFile('image')) {
            // publicディスクの指定フォルダに保存 (ファイル名は自動生成される)
            $path = $request->file('image')->store($folder, 'public');

            // 4. レスポンス
            // path: DB保存用 (例: products/abc.jpg)
            // url:  即座にプレビュー表示するためのフルURL
            return response()->json([
                'message' => 'アップロード成功',
                'path' => $path,
                'url'  => asset(Storage::url($path)),
            ], 201);
        }

        return response()->json(['message' => '画像ファイルが見つかりません'], 400);
    }
}
