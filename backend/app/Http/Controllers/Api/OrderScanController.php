<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Order;
use App\Models\UserTicket;
use App\Services\AdmissionService; // ★ 追加
use Kreait\Laravel\Firebase\Facades\Firebase;

class OrderScanController extends Controller
{
    public function redeem(Request $request, AdmissionService $service)
    {
        $qrCodeId = $request->input('qr_code_id');

        if (!$qrCodeId) {
            return response()->json(['message' => 'QRコードIDが必要です'], 422);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 1. 基本権限チェック [cite: 182-183]
        if (!in_array($user->role, ['artist', 'admin', 'staff'])) {
            return response()->json(['message' => 'この操作を行う権限がありません'], 403);
        }

        try {
            // 2. 誤スキャン防止チェック (チケット用QRをスキャンしていないか) [cite: 187-188]
            if (UserTicket::where('qr_code_id', $qrCodeId)->exists()) {
                throw new \Exception('これは入場チケット用のQRコードです。入場モードに切り替えてください。', 400);
            }

            // 3. Serviceによる引換処理 (悲観ロック & ステータスを 'completed' へ更新)
            $order = $service->redeemOrder($qrCodeId);

            // 4. Scope Security: 担当アーティストのチェック (引換後に実行) [cite: 191-193]
            if ($user->role !== 'admin') {
                $requiredOwnerId = ($user->role === 'staff') ? $user->employer_id : $user->id;
                $hasUnauthorizedItem = $order->items()->whereHas('product', function ($q) use ($requiredOwnerId) {
                    $q->where('artist_id', '!=', $requiredOwnerId);
                })->exists();

                if ($hasUnauthorizedItem) {
                    throw new \Exception('権限がありません。担当外のグッズです。', 403);
                }
            }

            // 5. Firestore 更新 (リアルタイム反映) 
            $this->syncToFirestore($order, $user->id);

            return response()->json([
                'message' => '引き換えが完了しました',
                'order' => $order->load('items', 'user')
            ]);
        } catch (\Exception $e) {
            $status = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }

    private function syncToFirestore(Order $order, $scannerId)
    {
        try {
            Firebase::firestore()->database()
                ->collection('order_status')
                ->document($order->qr_code_id)
                ->set([
                    'status' => 'completed',
                    'updatedAt' => date('c'),
                    'scanner_id' => (int)$scannerId
                ]);
        } catch (\Exception $e) {
            Log::error('Firestore update failed: ' . $e->getMessage());
        }
    }
}
