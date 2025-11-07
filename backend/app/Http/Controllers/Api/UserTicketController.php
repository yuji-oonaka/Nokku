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
}