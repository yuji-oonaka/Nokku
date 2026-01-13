<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use App\Models\Product; // 追加
use App\Observers\ProductObserver; // 追加

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // DBの文字数制限回避設定 (もしあれば維持)
        Schema::defaultStringLength(191);

        // ★ Observerの登録
        Product::observe(ProductObserver::class);
    }
}
