<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\UserTicket\ScanTicketRequest;
use App\Http\Requests\UserTicket\ManualEnterRequest;
use App\Services\TicketAdmissionService;
use Illuminate\Http\JsonResponse;

class UserTicketController extends Controller
{
    protected $admissionService;

    public function __construct(TicketAdmissionService $admissionService)
    {
        $this->admissionService = $admissionService;
    }

    /**
     * 自分のチケット一覧を取得
     */
    public function index(): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 整合性を保つため、リレーションを含めて取得
        $myTickets = $user->userTickets()
            ->with(['event', 'ticketType'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($myTickets);
    }

    /**
     * QRコードによるスキャン入場
     */
    public function scanTicket(ScanTicketRequest $request): JsonResponse
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $qrCodeId = $request->validated('qr_code_id');

            // サービス側で権限確認とステータス更新を一括実行
            $result = $this->admissionService->processAdmission($user, $qrCodeId, 'qr');

            return response()->json($result);
        } catch (\Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    /**
     * ID手入力による入場
     */
    public function enterManually(ManualEnterRequest $request): JsonResponse
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $ticketId = $request->validated('ticket_id');

            $result = $this->admissionService->processAdmission($user, $ticketId, 'manual');

            return response()->json($result);
        } catch (\Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }
}
