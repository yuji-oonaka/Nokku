<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\UserTicket\ScanTicketRequest; // 追加
use App\Http\Requests\UserTicket\ManualEnterRequest; // 追加
use App\Services\TicketAdmissionService; // 追加

class UserTicketController extends Controller
{
    /**
     * 自分のチケット一覧を取得
     */
    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $myTickets = $user->userTickets()
            ->with(['event', 'ticketType'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($myTickets);
    }

    /**
     * QRコードによるスキャン入場
     */
    public function scanTicket(ScanTicketRequest $request, TicketAdmissionService $service)
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            $result = $service->processAdmission(
                $user,
                $request->validated('qr_code_id'),
                'qr'
            );

            return response()->json($result);
        } catch (\Exception $e) {
            // Serviceから投げられた例外コードを使用。なければ500
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;

            // 使用済み(409)の場合など、フロントエンドに必要な情報を返すための分岐が必要ならここで行う
            // 例: チケット情報を返すなど（今回はシンプルにメッセージのみ）

            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    /**
     * ID手入力による入場
     */
    public function enterManually(ManualEnterRequest $request, TicketAdmissionService $service)
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            $result = $service->processAdmission(
                $user,
                $request->validated('ticket_id'),
                'manual'
            );

            return response()->json($result);
        } catch (\Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }
}
