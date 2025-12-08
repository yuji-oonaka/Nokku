<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\UserTicketController;
use App\Http\Controllers\Api\TicketTypeController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ImageUploadController;
use App\Http\Controllers\Api\InquiryController;
use App\Http\Controllers\Api\ArtistController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderScanController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\StripeWebhookController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);
// --- 認証 ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// --- 認証済みユーザーのみアクセス可能 ---
Route::middleware('firebase.auth')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // --- イベント・グッズ ---
    Route::apiResource('events', EventController::class);
    Route::get('/events/{event}/ticket-types', [EventController::class, 'getTicketTypes']);
    Route::apiResource('products', ProductController::class);

    // --- チケット・決済関連 ---
    // Stripe決済Intent作成 (必要に応じて使用)
    Route::post('/create-payment-intent', [PaymentController::class, 'createPaymentIntent']);
    
    // チケット関連
    Route::get('/my-tickets', [UserTicketController::class, 'index']);
    Route::apiResource('ticket-types', TicketTypeController::class);
    
    // ★ 新規追加: チケット購入API (在庫チェック付き)
    Route::post('/tickets/purchase', [UserTicketController::class, 'purchase']);
    
    Route::post('/tickets/scan', [UserTicketController::class, 'scanTicket']); // チケット用スキャン

    // 旧ルート（必要なければ削除可能ですが、念のため残しています）
    Route::post('/create-ticket-payment-intent', [PaymentController::class, 'createTicketPaymentIntent']);


    // --- E-commerce v2 (注文API) ---
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/my-orders', [OrderController::class, 'index']);

    // グッズ引換スキャン
    Route::post('/orders/redeem', [OrderScanController::class, 'redeem']);

    Route::get('/orders/{order}', [OrderController::class, 'show']);   // 詳細取得
    
    // --- 投稿 (お知らせ) ---
    Route::apiResource('posts', PostController::class);

    // --- ユーザープロフィール・住所 ---
    Route::get('/profile', [UserController::class, 'show']);
    Route::put('/profile', [UserController::class, 'update']);

    // --- その他 ---
    Route::post('/upload', [ImageUploadController::class, 'store']);
    Route::post('/inquiries', [InquiryController::class, 'store']);

    // --- アーティスト関連 ---
    Route::get('/artists', [ArtistController::class, 'index']);
    Route::post('/artists/{artist}/follow', [ArtistController::class, 'follow']);
    Route::delete('/artists/{artist}/unfollow', [ArtistController::class, 'unfollow']);
    Route::get('/artists/{artist}', [ArtistController::class, 'show']);
    
    // お気に入り機能
    Route::post('/products/{product}/favorite', [FavoriteController::class, 'toggle']);
    Route::get('/my-favorites', [FavoriteController::class, 'index']);
});