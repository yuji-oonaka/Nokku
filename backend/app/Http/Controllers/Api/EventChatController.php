<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\ChatService;
use Exception;

class EventChatController extends Controller
{
    protected $chatService;

    public function __construct(ChatService $chatService)
    {
        $this->chatService = $chatService;
    }

    public function consumeMessage(Request $request)
    {
        $request->validate(['event_id' => 'required', 'room_id' => 'required']);

        try {
            // ポイント: 引数を (int) でキャストして、型の不一致を防ぐ
            $log = $this->chatService->consumeMessage(
                (int) $request->user()->id,
                (int) $request->event_id,
                (int) $request->room_id
            );

            return response()->json([
                'status' => 'success',
                'consumed' => $log->consumed_points,
                'is_free' => $log->is_free,
            ]);
        } catch (Exception $e) {
            // エラーメッセージに基づいた適切なステータスコードを返却
            $code = $e->getMessage() === 'SPAM_DETECTED' ? 429 : 402;
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], $code);
        }
    }
}
