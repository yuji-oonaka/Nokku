<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\UserChatLog;
use App\Services\PointService;
use Carbon\Carbon;

class EventChatController extends Controller
{
    protected $pointService;

    // 定数: 無料枠の回数と連投制限秒数
    const FREE_LIMIT = 10;
    const SPAM_INTERVAL_SECONDS = 5;
    const MESSAGE_COST = 5; // ポイント消費量

    public function __construct(PointService $pointService)
    {
        $this->pointService = $pointService;
    }

    public function consumeMessage(Request $request)
    {
        $request->validate([
            'event_id' => 'required',
            'room_id' => 'required',
        ]);

        $user = $request->user();
        $eventId = $request->input('event_id');
        $roomId = $request->input('room_id');

        // --- 🛡️ 1. 連投制限 (Spam Check) ---
        // ★修正: 「このルームでの」直近の発言を取得 (他のルームでの発言は影響させない)
        $lastLog = UserChatLog::where('user_id', $user->id)
            ->where('event_id', $eventId)
            ->where('room_id', $roomId)
            ->latest('created_at')
            ->first();

        if ($lastLog && Carbon::parse($lastLog->created_at)->diffInSeconds(Carbon::now()) < self::SPAM_INTERVAL_SECONDS) {
            // 429 Too Many Requests
            return response()->json([
                'status' => 'error',
                'message' => '発言の間隔を空けてください。'
            ], 429);
        }

        // --- 🎁 2. 無料枠チェック (Free Tier) ---
        // ★修正: 「このルームでの」発言数をカウント (ルームを変えればまた無料枠がある)
        $count = UserChatLog::where('user_id', $user->id)
            ->where('event_id', $eventId)
            ->where('room_id', $roomId)
            ->count();

        if ($count < self::FREE_LIMIT) {
            // 無料枠内ならポイント消費せずログだけ記録
            UserChatLog::create([
                'user_id' => $user->id,
                'event_id' => $eventId,
                'room_id' => $roomId,
            ]);

            return response()->json([
                'status' => 'success',
                'consumed' => 0,
                'is_free' => true,
                'remaining_free' => self::FREE_LIMIT - ($count + 1),
                'message' => '無料枠で送信しました'
            ]);
        }

        // --- 💰 3. ポイント消費 (Paid Tier) ---
        // ★修正: トランザクションで囲む (ポイントだけ減ってログが残らない事故を防ぐ)
        try {
            DB::transaction(function () use ($user, $eventId, $roomId) {
                // ポイント消費
                $this->pointService->consumePoints(
                    $user->id,
                    self::MESSAGE_COST,
                    \App\Models\PointTransaction::TYPE_CHAT_MESSAGE, // ★タイプ指定
                    "チャット送信: Event {$eventId}",
                    ['event_id' => $eventId, 'room_id' => $roomId]
                );

                // ログ記録
                UserChatLog::create([
                    'user_id' => $user->id,
                    'event_id' => $eventId,
                    'room_id' => $roomId,
                ]);
            });

            return response()->json([
                'status' => 'success',
                'consumed' => self::MESSAGE_COST,
                'is_free' => false,
            ]);
        } catch (\Exception $e) {
            // ポイント不足時などのエラーハンドリング
            // PointServiceが投げる例外メッセージをそのまま返すか、汎用メッセージにするか
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 402); // 402 Payment Required
        }
    }

    // ... consumeRoomCreate は変更なし ...
    public function consumeRoomCreate(Request $request)
    {
        $request->validate(['event_id' => 'required']);
        $user = $request->user();

        try {
            $this->pointService->consumePoints(
                $user->id,
                50,
                \App\Models\PointTransaction::TYPE_ROOM_CREATE, // ★タイプ指定
                "ルーム作成: Event {$request->event_id}",
                ['event_id' => $request->event_id]
            );
            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 402);
        }
    }
}
