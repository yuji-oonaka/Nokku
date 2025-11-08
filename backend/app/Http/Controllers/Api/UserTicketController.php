<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // 👈 ログインユーザー取得のため use

class UserTicketController extends Controller
{
    /**
     * ログイン中のユーザーが所有するチケット一覧を取得
     */
    public function index()
    {
        $user = Auth::user();

        // ログイン中のユーザーIDに紐づく UserTicket をすべて取得
        // 'with' を使って、関連する「イベント情報」と「券種情報」も一緒に読み込む (Eager Loading)
        $myTickets = $user->userTickets()
                           ->with(['event', 'ticketType']) // 👈 リレーションシップ名を指定
                           ->orderBy('created_at', 'desc') // 新しい順
                           ->get();

        return response()->json($myTickets);
    }

    /**
     * QRコードをスキャンしてチケットを使用済みにする
     */
    public function scanTicket(Request $request)
    {
        // 1. バリデーション
        $validated = $request->validate([
            'qr_code_id' => 'required|string|exists:user_tickets,qr_code_id',
        ]);

        // 2. 認証済みユーザーの取得（スキャン実行者）
        $scannerUser = Auth::user();

        // 3. 権限チェック (管理者またはアーティストのみがスキャン可能)
        // ※引き継ぎ書では権限分離は後回しだが、API保護のため最低限のチェックは推奨
        if ($scannerUser->role !== 'admin' && $scannerUser->role !== 'artist') {
             return response()->json(['message' => '権限がありません。'], 403);
        }

        // 4. チケットの検索
        $ticket = UserTicket::where('qr_code_id', $validated['qr_code_id'])->firstOrFail();

        // 5. 使用済みかチェック
        if ($ticket->is_used) {
            return response()->json([
                'message' => 'このチケットは既に使用済みです。',
                'ticket' => $ticket->load('event', 'ticketType') // 参考までにチケット情報も返す
            ], 409); // 409 Conflict (競合)
        }

        // 6. チケットを使用済みに更新
        $ticket->is_used = true;
        $ticket->save();

        // 7. 成功レスポンス
        return response()->json([
            'message' => 'チケットを正常に使用済みにしました。',
            'ticket' => $ticket->load('event', 'ticketType')
        ], 200);
    }
}