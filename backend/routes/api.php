<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
// ↓↓↓ 以下2行を追記 ↓↓↓
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\ProductController;

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
    
    // ↓↓↓ ここから追記 ↓↓↓

    // --- イベント・グッズ (Sprint 2) ---
    // 'events' と 'products' のAPIエンドポイントをまとめて定義
    // (index, store, show, update, destroy が自動生成される)
    Route::apiResource('events', EventController::class);
    Route::apiResource('products', ProductController::class);

    // ↑↑↑ ここまで追記 ↑↑↑
});