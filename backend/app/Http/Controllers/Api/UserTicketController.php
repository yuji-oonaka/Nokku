<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
// 1. ★ Firebase/Firestore 関連と、必要なモデルを use します
use App\Models\UserTicket;
use Kreait\Firebase\Contract\Firestore; // (kreait/laravel-firebase パッケージを想定)
use Illuminate\Support\Facades\Log; // ログ出力用

class UserTicketController extends Controller
{
    // 2. ★ Firestore をコンストラクタで注入
    protected $firestore;

    public function __construct(Firestore $firestore)
    {
        // 'firestore' サービスコンテナからインスタンスを受け取る
        $this->firestore = $firestore;
    }

    /**
     * ログイン中のユーザーが所有するチケット一覧を取得
     * (変更なし)
     */
    public function index()
    {
        /** @var \App\Models\User $user */ //
        $user = Auth::user();

        $myTickets = $user->userTickets()
            ->with(['event', 'ticketType'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($myTickets);
    }

    /**
     * QRコードをスキャンしてチケットを使用済みにする
     * (★ このメソッドを修正します)
     */
    public function scanTicket(Request $request)
    {
        // 1. バリデーション (変更なし)
        $validated = $request->validate([
            'qr_code_id' => 'required|string|exists:user_tickets,qr_code_id',
        ]);

        // 2. 認証済みユーザーの取得（スキャン実行者）(変更なし)
        $scannerUser = Auth::user();

        // 3. 権限チェック (変更なし)
        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
            return response()->json(['message' => '権限がありません。'], 403);
        }

        // 4. チケットの検索 (変更なし)
        $ticket = UserTicket::where('qr_code_id', $validated['qr_code_id'])->firstOrFail();

        // 5. 使用済みかチェック (変更なし)
        if ($ticket->is_used) {
            return response()->json([
                'message' => 'このチケットは既に使用済みです。',
                'ticket' => $ticket->load('event', 'ticketType')
            ], 409); // 409 Conflict
        }

        // 6. チケットを使用済みに更新 (MySQL) (変更なし)
        $ticket->is_used = true;
        $ticket->save();

        // 7. ★ (NEW) Firestore にリアルタイム通知を書き込む
        try {
            // 'ticket_status' という新しいコレクションを作成
            // ドキュメントIDには、QRコードID（UUID）をそのまま使います
            $docRef = $this->firestore->database()
                ->collection('ticket_status')
                ->document($ticket->qr_code_id);

            // データをセット
            $docRef->set([
                'status' => 'used', // 👈 ユーザー側に「使用済み」を伝える
                'is_used' => true,
                'scanned_at' => new \DateTime(), // スキャンされた日時
                'scanner_id' => $scannerUser->id, // (参考) 誰がスキャンしたか
            ]);
        } catch (\Exception $e) {
            // Firestoreへの書き込みが失敗しても、チケット処理 (MySQL) は完了しているので、
            // 致命的なエラーにはしない。ただし、ログには残すべき。
            Log::error('Firestore write failed for ticket ' . $ticket->qr_code_id . ': ' . $e->getMessage());
        }

        // 8. 成功レスポンス (元の Step 7)
        return response()->json([
            'message' => 'チケットを正常に使用済みにしました。',
            'ticket' => $ticket->load('event', 'ticketType')
        ], 200);
    }
}
