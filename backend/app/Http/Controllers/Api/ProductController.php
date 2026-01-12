<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Http\Resources\ProductResource; // ★追加
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    /**
     * グッズ一覧を取得
     */
    public function index()
    {
        $userId = Auth::id();

        // ★ artist情報をEager Loadingしつつ、N+1問題を回避
        $query = Product::with('artist')
            ->withCount('favoritedBy as likes_count')
            ->orderBy('created_at', 'desc');

        if ($userId) {
            $query->withExists(['favoritedBy as is_liked' => function ($q) use ($userId) {
                $q->where('user_id', $userId);
            }]);
        }

        // ページネーションを追加 (グッズが増えた時のため)
        // アプリ側でスクロールロードするなら paginate(20) などに変更可能
        $products = $query->get();

        // ★ Resourceコレクションとして返す
        return ProductResource::collection($products);
    }

    /**
     * 新しいグッズを作成
     */
    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
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

        // 作成直後はリレーションがないのでロードしておく
        $product->load('artist');

        // ★ Resourceで返す
        return new ProductResource($product);
    }

    /**
     * グッズ詳細
     */
    public function show(Product $product)
    {
        $userId = Auth::id();

        // リレーション読み込み
        $product->load(['artist'])
            ->loadCount('favoritedBy as likes_count');

        // is_liked の手動注入 (Eloquentの属性として追加)
        $product->is_liked = $userId
            ? $product->favoritedBy()->where('user_id', $userId)->exists()
            : false;

        // ★ Resourceで返す
        return new ProductResource($product);
    }

    /**
     * グッズ更新
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

        // 更新後もResourceで返す
        return new ProductResource($product);
    }

    /**
     * グッズ削除
     */
    public function destroy(Product $product)
    {
        $user = Auth::user();

        if ($user->id !== $product->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'このグッズを削除する権限がありません'], 403);
        }

        // S3/ローカル画像の削除ロジック
        // (httpで始まる外部画像の場合は削除しないガードを入れるとより安全)
        if ($product->image_url && !str_starts_with($product->image_url, 'http')) {
            Storage::disk('public')->delete($product->image_url);
        }

        $product->delete();

        return response()->json(null, 204);
    }
}
