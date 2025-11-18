<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage; // use されていることを確認

class ProductController extends Controller
{
    /**
     * グッズ一覧を取得 (index)
     */
    public function index()
    {
        $products = Product::withCount('favoritedBy as likes_count')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($products);
    }

    /**
     * 新しいグッズを作成 (store)
     * (ここは既に修正済みです)
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
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // image (ファイル)
        ]);

        $productData = $validatedData;
        $productData['artist_id'] = $user->id;

        if ($request->hasFile('image')) {
            $path = Storage::disk('public')->put('products', $request->file('image'));
            $productData['image_url'] = $path;
        }

        $product = Product::create($productData);

        return response()->json($product, 201);
    }

    /**
     * 特定のグッズ詳細を取得 (show)
     * (変更なし)
     */
    public function show(Product $product)
    {
        // ★ 詳細取得時もカウントを追加 (loadCount を使用)
        $product->loadCount('favoritedBy as likes_count');
        return response()->json($product);
    }

    /**
     * グッズ情報を更新 (update)
     *
     * ★★★ ここからが修正箇所です ★★★
     */
    public function update(Request $request, Product $product)
    {
        $user = Auth::user();
        if ($user->id !== $product->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'グッズの編集権限がありません'], 403);
        }

        // 4. ★ バリデーションを修正 (store と同じ)
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
            'stock' => 'required|integer|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // 👈 'image_url' から 'image' に変更
        ]);

        // 5. ★ 画像更新ロジックを追加
        if ($request->hasFile('image')) {
            // 5-a. 既存の画像があれば削除
            if ($product->image_url) {
                Storage::disk('public')->delete($product->image_url);
            }

            // 5-b. 新しい画像を保存
            $path = Storage::disk('public')->put('products', $request->file('image'));
            $validatedData['image_url'] = $path; // 👈 'image_url' カラムにパスをセット
        }

        // データを更新
        $product->update($validatedData);

        return response()->json($product);
    }

    /**
     * グッズを削除 (destroy)
     *
     * ★★★ ここも修正箇所です ★★★
     */
    public function destroy(Product $product)
    {
        $user = Auth::user();

        if ($user->id !== $product->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'このグッズを削除する権限がありません'], 403);
        }

        // 6. ★ 画像ファイルも Storage から削除
        if ($product->image_url) {
            Storage::disk('public')->delete($product->image_url);
        }

        // DBからレコードを削除
        $product->delete();

        return response()->json(null, 204);
    }
}
