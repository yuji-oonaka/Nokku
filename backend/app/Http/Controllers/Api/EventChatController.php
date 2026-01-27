<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\UserChatLog;
use App\Services\PointService;
use App\Services\ChatService;
use Carbon\Carbon;

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
            $log = $this->chatService->consumeMessage(
                $request->user()->id,
                $request->event_id,
                $request->room_id
            );

            return response()->json([
                'status' => 'success',
                'consumed' => $log->consumed_points,
                'is_free' => $log->is_free,
            ]);
        } catch (\Exception $e) {
            $code = $e->getMessage() === 'SPAM_DETECTED' ? 429 : 402;
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], $code);
        }
    }
}