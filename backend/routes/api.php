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
use App\Http\Controllers\Api\EventChatController;
use App\Http\Controllers\Api\LoginBonusController;
use App\Http\Controllers\Api\GachaController;
use App\Http\Controllers\Api\SubscriptionController;

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

// ★ 追加: 決済完了・キャンセル画面（認証不要のWebルートとして扱うが、APIグループに書いて簡易対応）
// 本来は routes/web.php が適切ですが、APIサーバーとして完結させるためここでも可
// ただし、Cashierのcheckoutが返すリダイレクト先としてアクセス可能であること。
Route::get('/subscription/success', [SubscriptionController::class, 'success'])->name('subscription.success');
Route::get('/subscription/cancel', [SubscriptionController::class, 'cancel'])->name('subscription.cancel');

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
    Route::post('/orders/confirm-cash', [OrderScanController::class, 'confirmCash']); // ★ 現金確認 (軽量コントローラー)
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
    Route::post('/inquiries/{id}/messages', [InquiryController::class, 'sendMessage']); // メッセージ送信
    Route::patch('/inquiries/{id}/close', [InquiryController::class, 'close']); // 解決済みにする

    // --- イベントチャット機能（ポイント消費） ---
    Route::prefix('event-chat')->group(function () {
        // 発言時のポイント消費
        Route::post('/consume-message', [EventChatController::class, 'consumeMessage']);

        // ルーム作成時のポイント消費
        Route::post('/consume-room', [EventChatController::class, 'consumeRoomCreate']);
    });

    // ログインボーナス
    Route::post('/login-bonus', [LoginBonusController::class, 'claim']);

    // サブスクリプション関連
    Route::prefix('subscription')->group(function () {
        Route::get('/plans', [SubscriptionController::class, 'getPlans']);
        Route::get('/status', [SubscriptionController::class, 'status']);

        Route::post('/checkout', [SubscriptionController::class, 'checkout']); // 新規
        Route::post('/renew', [SubscriptionController::class, 'renew']);       // 更新(おかわり)
        Route::post('/upgrade', [SubscriptionController::class, 'upgrade']);   // 上位変更
        Route::post('/portal', [SubscriptionController::class, 'portal']);     // 管理(解約/下位)
    });

    // --- ガチャ機能 ---
    Route::get('/gachas', [GachaController::class, 'index']);
    Route::get('/gachas/{id}', [GachaController::class, 'show']);
    Route::post('/gacha/spin', [GachaController::class, 'spin']);

    Route::get('/user/items', [UserController::class, 'items']);
    Route::patch('/user/icon', [UserController::class, 'updateIcon']);
});
