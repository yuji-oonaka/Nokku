<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Http\Requests\Event\StoreEventRequest;  // 追加
use App\Http\Requests\Event\UpdateEventRequest; // 追加
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class EventController extends Controller
{
    use AuthorizesRequests;

    /**
     * イベント一覧を取得 (index)
     */
    public function index(Request $request)
    {
        $filter = $request->input('filter', 'upcoming');
        $now = Carbon::now();

        $query = Event::with('artist:id,nickname,image_url');

        if ($filter === 'past') {
            $query->where('event_date', '<', $now)
                ->orderBy('event_date', 'desc');
        } else {
            $query->where('event_date', '>=', $now)
                ->orderBy('event_date', 'asc');
        }

        $events = $query->paginate(20);

        // ※ 元の仕様通り items() のみを返す (メタデータなし)
        return response()->json($events->items());
    }

    /**
     * 新しいイベントを作成 (store)
     */
    public function store(StoreEventRequest $request)
    {
        // Policyで権限チェック
        $this->authorize('create', Event::class);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // バリデーション済みデータ取得
        $eventData = $request->validated();
        $eventData['artist_id'] = $user->id;

        $event = Event::create($eventData);

        return response()->json($event, 201);
    }

    /**
     * 特定のイベント詳細を取得 (show)
     */
    public function show($id)
    {
        $event = Event::with(['artist:id,nickname,image_url', 'ticketTypes'])
            ->findOrFail($id);

        // Policyで閲覧権限チェック (現状trueだが将来のために)
        $this->authorize('view', $event);

        return response()->json([
            'event' => $event,
            'tickets' => $event->ticketTypes,
            'is_owner' => Auth::id() === $event->artist_id,
        ]);
    }

    /**
     * イベント情報を更新 (update)
     */
    public function update(UpdateEventRequest $request, Event $event)
    {
        // Policyでチェック
        // (所有者チェック + 「過去のイベントでないか」もPolicy内で判定)
        $this->authorize('update', $event);

        $event->update($request->validated());

        return response()->json($event);
    }

    /**
     * イベントを削除 (destroy)
     */
    public function destroy(Event $event)
    {
        // Policyでチェック
        $this->authorize('delete', $event);

        $event->delete();

        return response()->json(null, 204);
    }

    /**
     * Deprecated
     */
    public function getTicketTypes(Event $event)
    {
        $ticketTypes = $event->ticketTypes()->get();
        return response()->json($ticketTypes);
    }
}
