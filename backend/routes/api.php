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

    // ↓↓↓ 2. 決済用のルートを追記 ↓↓↓
    Route::post('/create-payment-intent', [PaymentController::class, 'createPaymentIntent']);
    Route::post('/create-ticket-payment-intent', [PaymentController::class, 'createTicketPaymentIntent']);
    Route::post('/confirm-ticket-purchase', [PaymentController::class, 'confirmTicketPurchase']);
    Route::get('/my-tickets', [UserTicketController::class, 'index']);
    Route::apiResource('ticket-types', TicketTypeController::class);
    Route::post('/tickets/scan', [UserTicketController::class, 'scanTicket']);
    
    Route::apiResource('posts', PostController::class)->only(['index', 'store']);

    Route::get('/profile', [UserController::class, 'show']);
    Route::put('/profile', [UserController::class, 'update']);

    Route::post('/upload-image', [ImageUploadController::class, 'store']);

    // 2. ↓↓↓ (お問い合わせ) ↓↓↓
    Route::post('/inquiries', [InquiryController::class, 'store']);

    // アーティスト一覧を取得 (role が 'artist' のユーザー)
    Route::get('/artists', [ArtistController::class, 'index']);

    // 特定のアーティストをフォローする
    Route::post('/artists/{artist}/follow', [ArtistController::class, 'follow']);

    // 特定のアーティストをアンフォローする
    Route::delete('/artists/{artist}/unfollow', [ArtistController::class, 'unfollow']);

    // (将来用: 特定のアーティストの詳細ページ)
    // Route::get('/artists/{artist}', [ArtistController::class, 'show']);
});