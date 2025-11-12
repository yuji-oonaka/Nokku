<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Kreait\Firebase\Contract\Auth as FirebaseAuth; // Firebase Auth
use App\Models\User; // Userモデル
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected $firebaseAuth;

    // (1) FirebaseAuthのインスタンスを自動的に受け取る
    public function __construct(FirebaseAuth $firebaseAuth)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    /**
     * ユーザー登録処理
     */
    public function register(Request $request)
    {
        // (2) リクエストからIDトークンを取得
        // 'Authorization: Bearer <token>' 形式を想定
        $idToken = $request->bearerToken(); 
        
        if (!$idToken) {
            return response()->json(['message' => 'IDトークンが見つかりません'], 401);
        }

        try {
            // (3) IDトークンをFirebaseに問い合わせて検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);

        } catch (\Exception $e) {
            // トークンが無効（期限切れなど）の場合
            return response()->json(['message' => 'IDトークンが無効です: ' . $e->getMessage()], 401);
        }

        // (4) トークンからFirebaseのUID (ユーザーID) と Email を取得
        $firebaseUid = $verifiedIdToken->claims()->get('sub');
        $email = $verifiedIdToken->claims()->get('email');

        // (5) 念のため、名前もリクエストから受け取る
        $validated = $request->validate([
        'real_name' => 'required|string|max:255',
        'nickname' => 'required|string|max:255|unique:users,nickname', // ニックネームは重複不可
        ]);

        // (6) DBのusersテーブルに保存
        $user = User::firstOrCreate(
        ['firebase_uid' => $firebaseUid], // このUIDで検索
        [
            'email' => $email,
            'real_name' => $validated['real_name'], // 👈 'name' から変更
            'nickname' => $validated['nickname'], // 👈 追加
            'firebase_uid' => $firebaseUid,
            'role' => 'user'
        ]
        );

        // (7) 成功レスポンス（作成したユーザー情報）を返す
        return response()->json([
            'message' => 'ユーザー登録が成功しました',
            'user' => $user
        ], 201);

    } // ← 🎯 ここで register メソッドを閉じる！

    /**
     * ユーザーログイン処理 (registerメソッドの外に定義)
     */
    public function login(Request $request)
    {
        // (1) リクエストからIDトークンを取得
        $idToken = $request->bearerToken();
        
        if (!$idToken) {
            return response()->json(['message' => 'IDトークンが見つかりません'], 401);
        }

        try {
            // (2) IDトークンをFirebaseに問い合わせて検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);

        } catch (\Exception $e) {
            // トークンが無効（期限切れなど）の場合
            return response()->json(['message' => 'IDトークンが無効です: ' . $e->getMessage()], 401);
        }

        // (3) トークンからFirebaseのUIDを取得
        $firebaseUid = $verifiedIdToken->claims()->get('sub');

        // (4) DBから該当ユーザーを検索
        $user = User::where('firebase_uid', $firebaseUid)->first();

        // (5) ユーザーが見つからない場合の処理
        if (!$user) {
            return response()->json([
                'message' => 'ユーザー情報がNOKKUのデータベースに見つかりません。'
            ], 404); // 404 Not Found
        }

        // (6) 成功レスポンス（見つかったユーザー情報）を返す
        return response()->json([
            'message' => 'ログインに成功しました',
            'user' => $user
        ], 200);

    } // ← 🎯 ここで login メソッドを閉じる！

} // ← 最後に class を閉じる