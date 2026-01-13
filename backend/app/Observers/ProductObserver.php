<?php

namespace App\Observers;

use App\Models\Product;
use Illuminate\Support\Facades\Storage;

class ProductObserver
{
    /**
     * Handle the Product "deleted" event.
     * グッズが削除された後に実行されます。
     */
    public function deleted(Product $product): void
    {
        // 外部URL(http~)以外の場合、ローカルストレージから画像を削除
        if ($product->image_url && !str_starts_with($product->image_url, 'http')) {
            Storage::disk('public')->delete($product->image_url);
        }
    }

    // 他のメソッド (created, updated, restored, forceDeleted) は
    // 今回使わないので削除しても構いませんし、空のまま残してもOKです。
}
