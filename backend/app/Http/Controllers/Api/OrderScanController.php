<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\TicketAdmissionService;
use Illuminate\Http\JsonResponse;

class OrderScanController extends Controller
{
    protected $service;

    public function __construct(TicketAdmissionService $service)
    {
        $this->service = $service;
    }

    public function redeem(Request $request): JsonResponse
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $qrCodeId = $request->input('qr_code_id');

            if (!$qrCodeId) return response()->json(['message' => 'QRコードIDが必要です'], 422);

            // ★ サービスを呼び出し、引換とFirestore同期を一括実行
            $result = $this->service->processOrderRedemption($user, $qrCodeId);

            return response()->json($result);
        } catch (\Throwable $e) { // Exceptionより広いThrowableで捕捉
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    public function confirmCash(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $qrCodeId = $request->input('qr_code_id');
            $result = $this->service->confirmCashPayment($user, $qrCodeId);
            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
