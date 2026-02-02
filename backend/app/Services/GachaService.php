<?php

namespace App\Services;

use App\Models\Gacha;
use App\Models\PointTransaction;
use App\Models\UserGachaLog;
use App\Models\GachaItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class GachaService
{
    protected PointService $pointService;

    public function __construct(PointService $pointService)
    {
        $this->pointService = $pointService;
    }

    public function spin(int $userId, int $gachaId): array
    {
        // 1. バリデーション (GachaItemとその先のProfileItemをロード)
        $gacha = Gacha::active()->with('items.profileItem')->find($gachaId);
        if (!$gacha) throw new Exception('現在開催されていないガチャです。');
        if ($gacha->items->isEmpty()) throw new Exception('アイテムが設定されていません。');

        try {
            return DB::transaction(function () use ($userId, $gacha) {
                // A. ポイント消費
                $user = $this->pointService->consumePoints(
                    $userId,
                    $gacha->consumption_point,
                    PointTransaction::TYPE_GACHA,
                    "ガチャプレイ: {$gacha->name}",
                    ['gacha_id' => $gacha->id]
                );

                // B. 抽選 (得られるのは GachaItem モデル)
                $winnerGachaItem = $this->lottery($gacha->items);
                $winnerProfileItem = $winnerGachaItem->profileItem; // 景品の実体

                // C. アイテム付与 or 重複変換
                // 判定は「景品ID(profile_item_id)」で行う
                $isDuplicate = $user->profileItems()
                    ->where('profile_item_id', $winnerProfileItem->id)
                    ->exists();

                $refundAmount = 0;

                if ($isDuplicate) {
                    /**
                     * [NOKKU Rounding Policy]
                     * ポイント還元時は、ユーザーへの過剰付与を防ぐため常に切り捨て(floor)を採用する。
                     * 計算式: 消費ポイント × ガシャ別還元率
                     */
                    $refundAmount = (int) floor($gacha->consumption_point * $gacha->refund_rate);

                    if ($refundAmount > 0) {
                        $this->pointService->addPoints(
                            $userId,
                            $refundAmount,
                            PointTransaction::TYPE_GACHA_REFUND,
                            "ガチャ重複還元: {$winnerProfileItem->name} (還元率: " . ($gacha->refund_rate * 100) . "%)",
                            ['original_gacha_id' => $gacha->id, 'applied_rate' => $gacha->refund_rate]
                        );
                    }
                } else {
                    // 新規獲得: ProfileItemをユーザーに紐付ける
                    $user->profileItems()->attach($winnerProfileItem->id, ['obtained_at' => now()]);
                }

                // D. 成功ログの保存 (gacha_item_id には GachaItemのIDを渡す) 
                UserGachaLog::create([
                    'user_id' => $userId,
                    'gacha_id' => $gacha->id,
                    'gacha_item_id' => $winnerGachaItem->id, // これで外部キー制約をクリア
                    'consumed_points' => $gacha->consumption_point,
                    'status' => UserGachaLog::STATUS_SUCCESS,
                    'is_duplicate' => $isDuplicate,
                    'refund_amount' => $refundAmount,
                ]);

                return [
                    'item' => $winnerProfileItem,
                    'is_duplicate' => $isDuplicate,
                    'refund_amount' => $refundAmount,
                    'remaining_points' => $user->fresh()->points,
                ];
            });
        } catch (Exception $e) {
            $this->logGachaFailure($userId, $gachaId, $e->getMessage(), $gacha->consumption_point);
            throw $e;
        }
    }

    /**
     * 重み付き抽選 (GachaItemモデルの probability_weight を使用) 
     */
    private function lottery($items)
    {
        $totalWeight = $items->sum('probability_weight');
        $random = mt_rand(1, $totalWeight);
        $currentWeight = 0;

        foreach ($items as $item) {
            $currentWeight += $item->probability_weight;
            if ($random <= $currentWeight) return $item;
        }
        return $items->last();
    }

    private function logGachaFailure($userId, $gachaId, $errorCode, $points)
    {
        try {
            UserGachaLog::create([
                'user_id' => $userId,
                'gacha_id' => $gachaId,
                'consumed_points' => $points,
                'status' => UserGachaLog::STATUS_FAILED,
                'error_code' => $errorCode,
            ]);
        } catch (Exception $e) {
            Log::error("Gacha Log Failure: " . $e->getMessage());
        }
    }
}
