<?php

namespace App\Services;

use App\Models\Gacha;
use App\Models\GachaItem;
use App\Models\User;
use App\Models\PointTransaction;
use App\Models\UserGachaLog; // ログ用モデル(後述)
use Illuminate\Support\Facades\DB;
use Exception;

class GachaService
{
    protected PointService $pointService;

    // PointServiceを依存注入
    public function __construct(PointService $pointService)
    {
        $this->pointService = $pointService;
    }

    /**
     * ガチャを1回回す
     * * @param int $userId ユーザーID
     * @param int $gachaId ガチャID
     * @return array 結果データ
     */
    public function spin(int $userId, int $gachaId): array
    {
        // 1. ガチャ情報の取得とバリデーション
        $gacha = Gacha::active()->find($gachaId); // activeスコープ利用
        if (!$gacha) {
            throw new Exception('現在開催されていない、または存在しないガチャです。');
        }

        // 2. 排出アイテムがない場合はエラー
        $items = $gacha->items;
        if ($items->isEmpty()) {
            throw new Exception('このガチャにはアイテムが設定されていません。');
        }

        // --- トランザクション開始 (Golden Cycle) ---
        return DB::transaction(function () use ($userId, $gacha, $items) {

            // A. ポイント消費 (PointService内でlockForUpdateされるため安全)
            $user = $this->pointService->consumePoints(
                $userId,
                $gacha->consumption_point,
                PointTransaction::TYPE_GACHA,
                "ガチャプレイ: {$gacha->name}",
                ['gacha_id' => $gacha->id]
            );

            // B. 抽選ロジック (重み付きランダム)
            $winnerItem = $this->lottery($items);

            // C. アイテム付与 or 重複変換
            $isDuplicate = false;
            $refundAmount = 0;

            // すでに持っているかチェック (exists)
            $hasItem = $user->profileItems()
                ->where('profile_item_id', $winnerItem->profile_item_id)
                ->exists();

            if ($hasItem) {
                // 重複: ポイント還元 (例: 消費ポイントの20%を還元)
                $isDuplicate = true;
                $refundAmount = (int) floor($gacha->consumption_point * 0.2);

                if ($refundAmount > 0) {
                    $this->pointService->addPoints(
                        $userId,
                        $refundAmount,
                        PointTransaction::TYPE_GACHA_REFUND,
                        "ガチャ重複変換: {$winnerItem->profileItem->name}",
                        ['original_gacha_id' => $gacha->id]
                    );
                }
            } else {
                // 新規獲得: user_profile_items に追加
                $user->profileItems()->attach($winnerItem->profile_item_id);
            }

            // D. ログ保存 (証跡)
            DB::table('user_gacha_logs')->insert([
                'user_id' => $userId,
                'gacha_id' => $gacha->id,
                'gacha_item_id' => $winnerItem->id,
                'consumed_points' => $gacha->consumption_point,
                'created_at' => now(),
            ]);

            // 結果を返却
            return [
                'user_id' => $userId,
                'item' => $winnerItem->profileItem, // プロフィールアイテム詳細
                'is_duplicate' => $isDuplicate,
                'refund_amount' => $refundAmount,
                'remaining_points' => $user->fresh()->points, // 最新のポイント
            ];
        });
    }

    /**
     * 重み付き抽選アルゴリズム
     */
    private function lottery($items)
    {
        $totalWeight = $items->sum('probability_weight');
        $random = rand(1, $totalWeight);
        $currentWeight = 0;

        foreach ($items as $item) {
            $currentWeight += $item->probability_weight;
            if ($random <= $currentWeight) {
                return $item;
            }
        }

        // 理論上ここには来ないが、念のため最後のアイテムを返す
        return $items->last();
    }
}
