<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::view('/', 'pages.index')->name('home');

// ▼▼▼ ここから下を追加してください ▼▼▼

// 利用規約 ( http://localhost/terms )
Route::view('/terms', 'pages.terms')->name('terms');

// プライバシーポリシー ( http://localhost/privacy )
Route::view('/privacy', 'pages.privacy')->name('privacy');

// 特定商取引法に基づく表記 ( http://localhost/legal )
Route::view('/legal', 'pages.legal')->name('legal');