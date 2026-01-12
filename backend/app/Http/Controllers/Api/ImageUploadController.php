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
        // 1. バリデーション (Security強化)
        // 'file': アップロードが成功したファイルであることを確認
        // 'image': PHPのgetimagesize等を使用し、画像としての正当性をバイナリレベルでチェック
        // 'mimes': 拡張子とMIMEタイプの整合性をチェック (SVGはXSSリスクがあるため除外)
        $request->validate([
            'image' => [
                'required',
                'file',            // アップロードエラーがないか確認
                'image',           // 画像ファイルであるか(バイナリチェック)
                'mimes:jpeg,png,jpg,gif,webp', // 許可する拡張子
                'max:5120'         // 5MB
            ],
            'type'  => 'required|string|in:product,event,avatar,post',
        ]);

        // 2. 保存先フォルダの決定
        $folder = match ($request->type) {
            'product' => 'products',
            'event'   => 'events',
            'avatar'  => 'avatars',
            'post'    => 'posts',
            default   => 'uploads',
        };

        // 3. 画像保存処理
        if ($request->hasFile('image')) {
            // publicディスクの指定フォルダに保存 (ファイル名はハッシュ化され自動生成)
            $path = $request->file('image')->store($folder, 'public');

            // 4. レスポンス
            return response()->json([
                'message' => 'アップロード成功',
                'path'    => $path,
                'url'     => asset(Storage::url($path)),
            ], 201);
        }

        // 基本的にバリデーションで弾かれるが、万が一ファイル取得に失敗した場合の保険
        return response()->json(['message' => '画像ファイルの処理に失敗しました'], 500);
    }
}
