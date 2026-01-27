<?php

namespace App\Services;

use App\Models\User;
use App\Models\PointTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // ★ここが抜けていたため警告が出ていました
use Exception;

class PointService
{
    /**
     * ポイント消費（汎用版）
     */
    public function consumePoints(int $userId, int $amount, string $type, string $description, array $metadata = [])
    {
        try {
            return DB::transaction(function () use ($userId, $amount, $type, $description, $metadata) {
                // 排他ロックでユーザー取得
                $user = User::lockForUpdate()->find($userId);

                if (!$user) {
                    throw new Exception('USER_NOT_FOUND');
                }

                if ($user->points < $amount) {
                    throw new Exception('INSUFFICIENT_POINTS');
                }

                $user->points -= $amount;
                $user->save();

                // 成功ログ：取引後残高(balance_after)を記録 [cite: 2]
                PointTransaction::create([
                    'user_id' => $user->id,
                    'amount' => -$amount,
                    'balance_after' => $user->points, // 保守の要
                    'type' => $type,
                    'status' => PointTransaction::STATUS_SUCCESS,
                    'description' => $description,
                    'metadata' => $metadata,
                ]);

                return $user;
            });
        } catch (Exception $e) {
            // トランザクション外で失敗ログを記録（ロールバックに巻き込まれないようにするため）
            $this->logFailure($userId, -$amount, $type, $e->getMessage(), $description, $metadata);
            
            // 上位（Controller等）へ例外を投げ直す
            throw $e;
        }
    }

    /**
     * ポイント付与（汎用版）
     */
    public function addPoints(int $userId, int $amount, string $type, string $description, array $metadata = [])
    {
        return DB::transaction(function () use ($userId, $amount, $type, $description, $metadata) {
            $user = User::lockForUpdate()->find($userId);

            if (!$user) {
                throw new Exception('ユーザーが見つかりません。');
            }

            $user->points += $amount;
            $user->save();

            PointTransaction::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'balance_after' => $user->points, // 加算後の残高
                'type' => $type,
                'status' => PointTransaction::STATUS_SUCCESS,
                'description' => $description,
                'metadata' => $metadata,
            ]);

            return $user;
        });
    }

    /**
     * 失敗ログをDBとファイルに記録
     */
    private function logFailure(int $userId, int $amount, string $type, string $errorCode, string $description, array $metadata)
    {
        try {
            // 1. Laravel標準ログ(storage/logs/laravel.log)に出力
            Log::error("Point Transaction Failed: {$errorCode}", [
                'user_id' => $userId,
                'amount' => $amount,
                'type' => $type,
                'description' => $description
            ]);

            // 2. DBに失敗レコードを刻む
            $user = User::find($userId);
            PointTransaction::create([
                'user_id' => $userId,
                'amount' => $amount,
                'balance_after' => $user ? $user->points : 0,
                'type' => $type,
                'status' => PointTransaction::STATUS_FAILED,
                'error_code' => $errorCode,
                'description' => "[FAILED] {$description}",
                'metadata' => array_merge($metadata, ['error' => $errorCode]),
            ]);
        } catch (Exception $logEx) {
            // ログ記録自体の失敗でシステムを止めないためのサイレントキャッチ
        }
    }
}