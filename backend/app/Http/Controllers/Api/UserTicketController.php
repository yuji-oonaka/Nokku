<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\UserTicket\ScanTicketRequest;
use App\Http\Requests\UserTicket\ManualEnterRequest;
use App\Services\TicketAdmissionService;
use App\Models\UserTicket; // ★追加: 権限チェックのためにモデルが必要

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

            // ★ Scope Security: 権限チェック
            // Serviceを呼ぶ前に、このチケットが操作可能なものか確認する
            $qrCodeId = $request->validated('qr_code_id');
            $this->checkScanPermission($user, $qrCodeId, 'qr');

            $result = $service->processAdmission(
                $user,
                $qrCodeId,
                'qr'
            );

            return response()->json($result);
        } catch (\Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
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

            // ★ Scope Security: 権限チェック
            $ticketId = $request->validated('ticket_id');
            $this->checkScanPermission($user, $ticketId, 'manual');

            $result = $service->processAdmission(
                $user,
                $ticketId,
                'manual'
            );

            return response()->json($result);
        } catch (\Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    /**
     * ★ 追加: スキャン権限の検証ロジック
     * スタッフの場合、雇用主のイベントかどうかを厳密にチェックする
     */
    private function checkScanPermission($user, $identifier, $mode)
    {
        // Adminは無条件で許可
        if ($user->role === 'admin') {
            return;
        }

        // ArtistでもStaffでもないユーザーはスキャン不可
        if (!in_array($user->role, ['artist', 'staff'])) {
            throw new \Exception('スキャン権限がありません。', 403);
        }

        // チケットを検索してイベントを特定する
        $query = UserTicket::with('event');

        if ($mode === 'qr') {
            $query->where('qr_code_id', $identifier);
        } else {
            $query->where('id', $identifier); // manualの場合はID
        }

        $ticket = $query->first();

        // チケットが見つからない場合は、ここではスルーしてServiceに404を出させるか、
        // あるいはここで404にしても良い。ここではServiceと挙動を合わせるためスルーしても良いが、
        // セキュリティ的には「存在しない」か「権限がない」か分からない方が安全な場合もある。
        // 今回は「存在すればチェック」を行う。
        if (!$ticket) {
            return; // 存在しないならServiceが404を返すので任せる
        }

        // --- 核心部分: 雇用主チェック ---
        $eventOwnerId = $ticket->event->artist_id;

        // スタッフなら「雇用主ID」、アーティストなら「自分ID」と比較
        $scanOperatorId = ($user->role === 'staff') ? $user->employer_id : $user->id;

        if ($eventOwnerId !== $scanOperatorId) {
            throw new \Exception('担当外のイベントチケットです。スキャン権限がありません。', 403);
        }
    }
}
