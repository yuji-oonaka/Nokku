<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use App\Models\User;
use App\Http\Requests\Auth\RegisterRequest; // Step 1で作ったリクエストを使用
use Illuminate\Support\Facades\Log; // エラーログ記録用

class AuthController extends Controller
{
    protected $firebaseAuth;

    public function __construct(FirebaseAuth $firebaseAuth)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    /**
     * ユーザー登録処理
     * バリデーションは RegisterRequest で自動的に行われます。
     */
    public function register(RegisterRequest $request)
    {
        // 1. トークンの有無チェック
        $idToken = $request->bearerToken();
        if (!$idToken) {
            return response()->json(['message' => 'IDトークンが必要です。'], 401);
        }

        try {
            // 2. IDトークンをFirebaseで検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);
        } catch (\Exception $e) {
            // ログに詳細を残し、ユーザーには汎用エラーを返す (セキュリティ対策)
            Log::error('Firebase Token Error (Register): ' . $e->getMessage());
            return response()->json(['message' => '認証トークンが無効です。'], 401);
        }

        // 3. トークンから情報を取得
        $firebaseUid = $verifiedIdToken->claims()->get('sub');
        $email = $verifiedIdToken->claims()->get('email');

        // 4. バリデーション済みデータを取得
        $validated = $request->validated();

        try {
            // 5. ユーザー作成 (firstOrCreateで冪等性を担保)
            $user = User::firstOrCreate(
                ['firebase_uid' => $firebaseUid],
                [
                    'email' => $email,
                    'real_name' => $validated['real_name'],
                    'nickname' => $validated['nickname'],
                    'firebase_uid' => $firebaseUid,
                    'role' => 'user'
                ]
            );

            return response()->json([
                'message' => 'ユーザー登録が成功しました',
                'user' => $user
            ], 201);
        } catch (\Exception $e) {
            Log::error('User Create Error: ' . $e->getMessage());
            return response()->json(['message' => 'ユーザー情報の保存に失敗しました。'], 500);
        }
    }

    /**
     * ユーザーログイン処理
     * * ルーティング側で 'FirebaseApiAuth' ミドルウェアを適用しているため、
     * ここに来た時点で「トークン検証」「DB存在確認」「Auth::login」は完了しています。
     */
    public function login(Request $request)
    {
        // ミドルウェアによってセットされたユーザー情報を取得
        $user = $request->user();

        // ★追加: Operatorのログインをブロック
        // アプリは現場・一般向けなので、管理専用のOperatorは弾きます
        if ($user->role === 'operator') {
            return response()->json([
                'message' => 'オペレーターアカウントではアプリをご利用いただけません。PC等の管理画面からアクセスしてください。'
            ], 403); // 403 Forbidden
        }

        // ログイン成功レスポンス
        return response()->json([
            'message' => 'ログインに成功しました',
            'user' => $user
        ], 200);
    }
}
