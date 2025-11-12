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
use App\Http\Controllers\Api\OrderController; // 1. ★ OrderController を use

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// --- 認証 (Sprint 1) ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- 認証済みユーザーのみアクセス可能 ---
Route::middleware('firebase.auth')->group(function () {

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // --- イベント・グッズ (Sprint 2 & 3) ---
    Route::apiResource('events', EventController::class);
    Route::get('/events/{event}/ticket-types', [EventController::class, 'getTicketTypes']);
    Route::apiResource('products', ProductController::class);

    // --- (旧) 決済・チケット ---
    Route::post('/create-payment-intent', [PaymentController::class, 'createPaymentIntent']);
    Route::post('/create-ticket-payment-intent', [PaymentController::class, 'createTicketPaymentIntent']);
    Route::post('/confirm-ticket-purchase', [PaymentController::class, 'confirmTicketPurchase']);
    Route::get('/my-tickets', [UserTicketController::class, 'index']);
    Route::apiResource('ticket-types', TicketTypeController::class);
    Route::post('/tickets/scan', [UserTicketController::class, 'scanTicket']);

    // 2. ★ E-commerce v2 (注文API) のルートを追加
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/my-orders', [OrderController::class, 'index']);

    // --- 投稿 (お知らせ) ---
    Route::apiResource('posts', PostController::class)->only(['index', 'store']);

    // --- ユーザープロフィール・住所 ---
    Route::get('/profile', [UserController::class, 'show']);
    Route::put('/profile', [UserController::class, 'update']);

    // --- その他 ---
    Route::post('/upload-image', [ImageUploadController::class, 'store']);
    Route::post('/inquiries', [InquiryController::class, 'store']);

    // --- アーティスト関連 ---
    Route::get('/artists', [ArtistController::class, 'index']);
    Route::post('/artists/{artist}/follow', [ArtistController::class, 'follow']);
    Route::delete('/artists/{artist}/unfollow', [ArtistController::class, 'unfollow']);
    Route::get('/artists/{artist}', [ArtistController::class, 'show']);
});
