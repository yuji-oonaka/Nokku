<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request; // 1. ★ Request を use
use Illuminate\Support\Facades\Auth;
use App\Models\TicketType;
use Carbon\Carbon; // 2. ★ Carbon (日付ライブラリ) を use

class EventController extends Controller
{
    /**
     * イベント一覧を取得 (index)
     * ★ 改造: 'filter' クエリパラメータ (upcoming / past) に対応
     */
    public function index(Request $request) // 3. ★ Request $request を引数に追加
    {
        // 4. ★ フィルターの値を取得 (デフォルトは 'upcoming')
        $filter = $request->input('filter', 'upcoming');
        $now = Carbon::now(); // 現在時刻を取得

        // 5. ★ クエリを組み立てる
        $query = Event::query();

        if ($filter === 'past') {
            // 【過去のイベント】
            // 開催日時が現在より前
            $query->where('event_date', '<', $now)
                  ->orderBy('event_date', 'desc'); // 開催日が新しい順 (最近終わった順)
        } else {
            // 【開催予定のイベント (デフォルト)】
            // 開催日時が現在以降
            $query->where('event_date', '>=', $now)
                  ->orderBy('event_date', 'asc'); // 開催日が近い順
        }

        // 6. ★ データを取得して返す
        $events = $query->get();
        
        return response()->json($events);
    }

    /**
     * 新しいイベントを作成 (store)
     */
    public function store(Request $request)
    {
        // ( ... 既存の store メソッド ... )
        // (変更なし)
        $user = Auth::user(); 
        if ($user->role !== 'artist' && $user->role !== 'admin') {
            return response()->json(['message' => 'イベントを作成する権限がありません'], 403);
        }
        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date',
        ]);
        $eventData = $validatedData;
        $eventData['artist_id'] = $user->id;
        $event = Event::create($eventData);
        return response()->json($event, 201);
    }

    /**
     * 特定のイベントに関連する券種一覧を取得
     */
    public function getTicketTypes(Event $event)
    {
        // ( ... 既存の getTicketTypes メソッド ... )
        // (変更なし)
        $ticketTypes = $event->ticketTypes()->get();
        return response()->json($ticketTypes);
    }

    /**
     * 特定のイベント詳細を取得 (show)
     */
    public function show(Event $event) 
    {
        // ( ... 既存の show メソッド ... )
        // (変更なし - 権限チェックは削除済み)
        return response()->json($event);
    }

    /**
     * イベント情報を更新 (update)
     */
    public function update(Request $request, Event $event)
    {
        // ( ... 既存の update メソッド ... )
        // (変更なし)
        $user = Auth::user();
        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => '権限がありません'], 403);
        }

        // 2. ★★★ (NEW) 過去イベントチェック ★★★
        // 開始日時を過ぎていたら編集禁止
        if (Carbon::parse($event->event_date)->isPast()) {
            return response()->json(['message' => '終了したイベントは編集できません'], 403);
        }
        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date',
        ]);
        $event->update($validatedData);
        return response()->json($event);
    }

    /**
     * イベントを削除 (destroy)
     */
    public function destroy(Event $event)
    {
        // ( ... 既存の destroy メソッド ... )
        // (変更なし)
        $user = Auth::user();
        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'このイベントを削除する権限がありません'], 403);
        }
        $event->delete();
        return response()->json(null, 204);
    }
}