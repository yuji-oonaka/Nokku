<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\FirebaseApiAuth;
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
use App\Http\Controllers\Api\OrderScanController; // ★ 追加: 軽量コントローラー
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
    ->middleware([FirebaseApiAuth::class, 'throttle:5,1']);

// --- 認証済みユーザーのみアクセス可能 ---
Route::middleware('firebase.auth')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // --- イベント・グッズ ---
    Route::apiResource('events', EventController::class);
    Route::get('/events/{event}/ticket-types', [EventController::class, 'getTicketTypes']);
    Route::apiResource('products', ProductController::class);

    // --- (旧) 決済・チケット ---
    Route::post('/create-payment-intent', [PaymentController::class, 'createPaymentIntent']);
    Route::post('/create-ticket-payment-intent', [PaymentController::class, 'createTicketPaymentIntent']);
    Route::post('/confirm-ticket-purchase', [PaymentController::class, 'confirmTicketPurchase']);
    Route::get('/my-tickets', [UserTicketController::class, 'index']);
    Route::apiResource('ticket-types', TicketTypeController::class);
    Route::post('/tickets/scan', [UserTicketController::class, 'scanTicket']); // 👈 チケット用スキャン
    // ★ 追加: 手入力入場ルート
    Route::post('/tickets/manual', [UserTicketController::class, 'enterManually']);

    // --- E-commerce v2 (注文API) ---
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/my-orders', [OrderController::class, 'index']);

    // ↓↓↓ 1. ★ 修正: グッズ引換スキャン (重いOrderControllerではなく、軽量なOrderScanControllerを使う) ↓↓↓
    Route::post('/orders/redeem', [OrderScanController::class, 'redeem']);

    Route::get('/orders/{order}', [OrderController::class, 'show']);   // ★ 詳細取得 (リロード用)
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
    Route::post('/products/{product}/favorite', [FavoriteController::class, 'toggle']); // いいね切替
    Route::get('/my-favorites', [FavoriteController::class, 'index']); // 一覧取得

    // 問い合わせ関連
    Route::get('/inquiries', [InquiryController::class, 'index']);      // 一覧取得
    Route::post('/inquiries', [InquiryController::class, 'store']);     // 新規作成
    Route::get('/inquiries/{id}', [InquiryController::class, 'show']);  // 詳細取得
    Route::patch('/inquiries/{id}/close', [InquiryController::class, 'close']); // 解決済みにする
});
