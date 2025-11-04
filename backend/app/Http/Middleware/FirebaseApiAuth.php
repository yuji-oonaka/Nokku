<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Kreait\Firebase\Contract\Auth as FirebaseAuth; // Firebase Auth
use App\Models\User; // Userモデル
use Illuminate\Support\Facades\Auth; // LaravelのAuth

class FirebaseApiAuth
{
    protected $firebaseAuth;

    public function __construct(FirebaseAuth $firebaseAuth)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. ヘッダーからIDトークンを取得
        $idToken = $request->bearerToken();
        if (!$idToken) {
            return response()->json(['message' => 'IDトークンが見つかりません'], 401);
        }

        try {
            // 2. IDトークンをFirebaseに問い合わせて検証
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);
        } catch (\Exception $e) {
            return response()->json(['message' => 'IDトークンが無効です'], 401);
        }

        // 3. トークンからFirebaseのUIDを取得
        $firebaseUid = $verifiedIdToken->claims()->get('sub');

        // 4. DBから該当ユーザーを検索
        $user = User::where('firebase_uid', $firebaseUid)->first();

        if (!$user) {
            return response()->json(['message' => 'ユーザーがDBに存在しません'], 404);
        }

        // 5. ★最重要★
        // Laravelに「このリクエストは、このユーザーが実行したことにしてね」と教える
        Auth::login($user);

        // 6. ユーザーを認証済みにして、次の処理（コントローラー）へ進める
        return $next($request);
    }
}