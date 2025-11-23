<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * グッズ一覧を取得 (index)
     */
    public function index()
    {
        // 現在のユーザーIDを取得（未ログインなら null）
        $userId = Auth::id();

        $query = Product::with('artist')
            ->withCount('favoritedBy as likes_count')
            ->orderBy('created_at', 'desc');

        // ログインしている場合、自分が「いいね」しているかどうかのフラグ (is_liked) を追加
        if ($userId) {
            $query->withExists(['favoritedBy as is_liked' => function ($q) use ($userId) {
                $q->where('user_id', $userId);
            }]);
        }

        $products = $query->get();

        // JSONレスポンスの整形（必要に応じて）
        // ここで is_liked がない場合（未ログイン時）は false をセットするなどの加工も可能ですが、
        // フロントエンドの型定義で optional (?) になっているため、このままでも動作します。

        return response()->json($products);
    }

    /**
     * 新しいグッズを作成 (store)
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'artist' && $user->role !== 'admin') {
            return response()->json(['message' => 'グッズを作成する権限がありません'], 403);
        }

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
            'stock' => 'required|integer|min:0',
            'limit_per_user' => 'nullable|integer|min:1',
            'image_url' => 'nullable|string',
        ]);

        $productData = $validatedData;
        $productData['artist_id'] = $user->id;

        $product = Product::create($productData);

        return response()->json($product, 201);
    }

    /**
     * 特定のグッズ詳細を取得 (show)
     */
    public function show(Product $product)
    {
        $userId = Auth::id();

        $product->load(['artist'])
            ->loadCount('favoritedBy as likes_count');

        // showでも is_liked を判定
        $product->is_liked = $userId
            ? $product->favoritedBy()->where('user_id', $userId)->exists()
            : false;

        return response()->json($product);
    }

    /**
     * グッズ情報を更新 (update)
     */
    public function update(Request $request, Product $product)
    {
        $user = Auth::user();
        if ($user->id !== $product->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'グッズの編集権限がありません'], 403);
        }

        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
            'stock' => 'required|integer|min:0',
            'limit_per_user' => 'nullable|integer|min:1',
            'image_url' => 'nullable|string',
        ]);

        $product->update($validatedData);

        return response()->json($product);
    }

    /**
     * グッズを削除 (destroy)
     */
    public function destroy(Product $product)
    {
        $user = Auth::user();

        if ($user->id !== $product->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'このグッズを削除する権限がありません'], 403);
        }

        if ($product->image_url) {
            Storage::disk('public')->delete($product->image_url);
        }

        $product->delete();

        return response()->json(null, 204);
    }
}
