<?php

namespace App\Services;

use App\Models\UserChatLog;
use App\Models\PointTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class ChatService
{
    protected PointService $pointService;

    // 定数管理
    public const FREE_LIMIT = 10;
    public const MESSAGE_COST = 5;
    public const SPAM_INTERVAL = 5;

    public function __construct(PointService $pointService)
    {
        $this->pointService = $pointService;
    }

    public function consumeMessage(int $userId, int $eventId, int $roomId)
    {
        // 1. 連投制限チェック
        $lastLog = UserChatLog::where('user_id', $userId)
            ->where('room_id', $roomId)
            ->latest('created_at')
            ->first();

        if ($lastLog && Carbon::parse($lastLog->created_at)->diffInSeconds(now()) < self::SPAM_INTERVAL) {
            throw new Exception('SPAM_DETECTED');
        }

        // 2. 無料枠判定
        $count = UserChatLog::where('user_id', $userId)
            ->where('room_id', $roomId)
            ->where('status', UserChatLog::STATUS_SUCCESS)
            ->count();

        $isFree = $count < self::FREE_LIMIT;

        try {
            return DB::transaction(function () use ($userId, $eventId, $roomId, $isFree, $count) {
                if (!$isFree) {
                    // 有料枠：ポイント消費
                    $this->pointService->consumePoints(
                        $userId,
                        self::MESSAGE_COST,
                        PointTransaction::TYPE_CHAT_MESSAGE,
                        "チャット送信: Room {$roomId}",
                        ['event_id' => $eventId, 'room_id' => $roomId]
                    );
                }

                // 実行ログ保存
                return UserChatLog::create([
                    'user_id' => $userId,
                    'event_id' => $eventId,
                    'room_id' => $roomId,
                    'status' => UserChatLog::STATUS_SUCCESS,
                    'is_free' => $isFree,
                    'consumed_points' => $isFree ? 0 : self::MESSAGE_COST,
                ]);
            });
        } catch (Exception $e) {
            $this->logChatFailure($userId, $eventId, $roomId, $e->getMessage(), $isFree);
            throw $e;
        }
    }

    private function logChatFailure($userId, $eventId, $roomId, $errorCode, $isFree)
    {
        try {
            UserChatLog::create([
                'user_id' => $userId,
                'event_id' => $eventId,
                'room_id' => $roomId,
                'status' => UserChatLog::STATUS_FAILED,
                'error_code' => $errorCode,
                'is_free' => $isFree,
                'consumed_points' => $isFree ? 0 : self::MESSAGE_COST,
            ]);
        } catch (Exception $e) {
            Log::error("Chat Log Error: " . $e->getMessage());
        }
    }
}
