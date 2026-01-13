<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Http\Resources\ProductResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests; // 👈 重要: これが必要な場合があります

class ProductController extends Controller
{
    // Laravel 11等、バージョンによってはControllerクラスに標準で含まれていますが、
    // 明示的にTraitを入れておくと安全です。
    use AuthorizesRequests;

    /**
     * グッズ一覧を取得
     */
    public function index()
    {
        // 閲覧権限はPolicyでも常にtrueなのでチェック不要だが、
        // 将来「非公開グッズ」を作る場合はここで $this->authorize('viewAny', Product::class); を呼ぶ

        $userId = Auth::id();

        $query = Product::with('artist')
            ->withCount('favoritedBy as likes_count')
            ->orderBy('created_at', 'desc');

        if ($userId) {
            $query->withExists(['favoritedBy as is_liked' => function ($q) use ($userId) {
                $q->where('user_id', $userId);
            }]);
        }

        return ProductResource::collection($query->paginate(20));
    }

    /**
     * 新しいグッズを作成
     */
    public function store(StoreProductRequest $request)
    {
        // ★ Policyでチェック: create権限があるか？
        // (以前の if ($user->role !== 'artist'...) は不要に)
        $this->authorize('create', Product::class);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $productData = $request->validated();
        $productData['artist_id'] = $user->id;

        $product = Product::create($productData);
        $product->load('artist');

        return new ProductResource($product);
    }

    /**
     * グッズ詳細
     */
    public function show(Product $product)
    {
        // ★ Policyでチェック: view権限があるか？ (現状は誰でもOK)
        $this->authorize('view', $product);

        $userId = Auth::id();

        $product->load(['artist'])
            ->loadCount('favoritedBy as likes_count');

        $product->is_liked = $userId
            ? $product->favoritedBy()->where('user_id', $userId)->exists()
            : false;

        return new ProductResource($product);
    }

    /**
     * グッズ更新
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        // ★ Policyでチェック: update権限があるか？ (所有者チェックもPolicy内で実行)
        $this->authorize('update', $product);

        $product->update($request->validated());

        return new ProductResource($product);
    }

    /**
     * グッズ削除
     */
    public function destroy(Product $product)
    {
        // Policyでチェック
        $this->authorize('delete', $product);

        // ★ 画像削除ロジックを削除 (Observerが自動でやってくれる)

        $product->delete();

        return response()->json(null, 204);
    }
}
