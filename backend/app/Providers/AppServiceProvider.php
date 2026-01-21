<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use App\Models\Product;
use App\Observers\ProductObserver;
use Illuminate\Support\Facades\Event;
use Laravel\Cashier\Events\WebhookReceived;
use App\Listeners\Stripe\GrantSubscriptionPoints;

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

        // ★ StripeのWebhookイベントリスナー登録
        Event::listen(WebhookReceived::class, GrantSubscriptionPoints::class);
    }
}
