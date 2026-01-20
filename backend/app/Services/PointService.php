<?php

namespace App\Services;

use App\Models\User;
use App\Models\PointTransaction;
use Illuminate\Support\Facades\DB;
use Exception;

class PointService
{
    /**
     * ポイント消費（汎用版）
     * @param string $type 取引種別 (PointTransaction::TYPE_xxx) ★追加
     */
    public function consumePoints(int $userId, int $amount, string $type, string $description, array $metadata = [])
    {
        $user = User::lockForUpdate()->find($userId);

        if (!$user) {
            throw new Exception('ユーザーが見つかりません。');
        }

        if ($user->points < $amount) {
            throw new Exception("ポイント不足 (必要: {$amount} / 所持: {$user->points})");
        }

        $user->points -= $amount;
        $user->save();

        PointTransaction::create([
            'user_id' => $user->id,
            'amount' => -$amount,
            'type' => $type, // ★ここで分類を保存
            'description' => $description,
            'metadata' => $metadata,
        ]);

        return $user;
    }

    // ▼▼▼ ★今回ここに追加します（追記） ▼▼▼
    /**
     * ポイント付与（汎用版）
     * @param string $type 取引種別 (PointTransaction::TYPE_xxx)
     */
    public function addPoints(int $userId, int $amount, string $type, string $description, array $metadata = [])
    {
        // 排他制御: ユーザーレコードをロックして取得
        $user = User::lockForUpdate()->find($userId);

        if (!$user) {
            throw new Exception('ユーザーが見つかりません。');
        }

        // ポイント加算 ( += )
        $user->points += $amount;
        $user->save();

        // 取引履歴の作成
        PointTransaction::create([
            'user_id' => $user->id,
            'amount' => $amount, // プラスの値
            'type' => $type,
            'description' => $description,
            'metadata' => $metadata,
        ]);

        return $user;
    }
}
