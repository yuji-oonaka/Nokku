<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // エイリアスの設定 (既存)
        $middleware->alias([
            'firebase.auth' => \App\Http\Middleware\FirebaseApiAuth::class,
        ]);

        // ★★★ 追加: Stripe Webhook を CSRF保護から除外 ★★★
        // これを書かないと、Stripeからの通知が "419 Page Expired" で弾かれる場合があります
        $middleware->validateCsrfTokens(except: [
            'api/stripe/webhook',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
