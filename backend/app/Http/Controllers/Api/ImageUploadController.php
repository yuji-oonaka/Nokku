<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Image\StoreImageRequest; // 作成したRequestを使用
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    /**
     * 画像をアップロードし、保存パスとURLを返す
     */
    public function store(StoreImageRequest $request)
    {
        // 1. 保存先フォルダの決定
        // バリデーション済みなので $request->type は安全に使用可能
        $folder = match ($request->type) {
            'product' => 'products',
            'event'   => 'events',
            'avatar'  => 'avatars',
            'post'    => 'posts',
            default   => 'uploads',
        };

        // 2. 画像保存処理
        // バリデーションで required, file, image が通っているため、必ずファイルは存在する
        $path = $request->file('image')->store($folder, 'public');

        // 3. レスポンス
        return response()->json([
            'message' => 'アップロード成功',
            'path'    => $path,
            'url'     => asset(Storage::url($path)),
        ], 201);
    }
}
