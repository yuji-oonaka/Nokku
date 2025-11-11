<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage; // 1. Storage ファサードを use
use Illuminate\Support\Facades\Auth; // 2. Auth ファサードを use

class ImageUploadController extends Controller
{
    /**
     * 画像をアップロードし、公開URLを返す
     */
    public function store(Request $request)
    {
        // 1. バリデーション
        // 'image' というキーで、画像ファイル (jpg, png, gif) が
        // 5MB (5120KB) 以内で送信されることを期待
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        // 2. ログイン中のユーザーIDを取得 (フォルダ名として使用)
        $userId = Auth::id();

        // 3. ファイルを保存
        // 'image' というキーで送信されたファイルを取得
        $file = $request->file('image');

        // 保存先のパス: storage/app/public/uploads/user_{id}/
        // ファイル名はランダムな一意の文字列
        $path = $file->store("public/uploads/user_{$userId}");

        // 4. 公開URLを生成
        // $path には 'public/uploads/...' が入っているため、
        // 'public/' を 'storage/' に置換してURLを組み立てる
        $url = Storage::url($path);

        // 5. 完全なURLを返す
        // (例: http://localhost/storage/uploads/user_1/image.jpg)
        return response()->json([
            'message' => '画像が正常にアップロードされました',
            'url' => asset($url) // asset() ヘルパーでドメイン名を付与
        ], 201);
    }
}