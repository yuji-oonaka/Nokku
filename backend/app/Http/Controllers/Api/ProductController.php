<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product; // 忘れずにProductモデルを use
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // ログインユーザー情報取得のため use

class ProductController extends Controller
{
    /**
     * グッズ一覧を取得 (index)
     */
    public function index()
    {
        // シンプルに全てのグッズを新しい順で返す
        $products = Product::orderBy('created_at', 'desc')->get();
        
        return response()->json($products);
    }

    /**
     * 新しいグッズを作成 (store)
     */
    public function store(Request $request)
    {
        // ログイン中のユーザー情報を取得
        $user = Auth::user();

        // 権限チェック：アーティストまたは管理者でなければ作成できない
        if ($user->role !== 'artist' && $user->role !== 'admin') {
            return response()->json(['message' => 'グッズを作成する権限がありません'], 403);
        }

        // バリデーション
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
            'stock' => 'required|integer|min:0',
            'image_url' => 'nullable|string|url', // 画像URL (任意)
        ]);

        // バリデーション済みデータに、作成者(アーティスト)のIDを追加
        $productData = $validatedData;
        $productData['artist_id'] = $user->id;

        // DBに保存
        $product = Product::create($productData);

        // 作成したグッズ情報をJSONで返す
        return response()->json($product, 201); // 201 Created
    }

    /**
     * 特定のグッズ詳細を取得 (show)
     * (今回はまだ実装しないので、中身は空のまま)
     */
    public function show(string $id)
    {
        //
    }

    /**
     * グッズ情報を更新 (update)
     * (今回はまだ実装しないので、中身は空のまま)
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * グッズを削除 (destroy)
     * (今回はまだ実装しないので、中身は空のまま)
     */
    public function destroy(string $id)
    {
        //
    }
}