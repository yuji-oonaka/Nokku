<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class EventController extends Controller
{
    /**
     * イベント一覧を取得 (index)
     */
    public function index(Request $request)
    {
        $filter = $request->input('filter', 'upcoming');
        $now = Carbon::now();

        // ✅ 正しいカラム指定 (image_url)
        $query = Event::with('artist:id,nickname,image_url');

        if ($filter === 'past') {
            $query->where('event_date', '<', $now)
                ->orderBy('event_date', 'desc');
        } else {
            $query->where('event_date', '>=', $now)
                ->orderBy('event_date', 'asc');
        }

        $events = $query->paginate(20);

        return response()->json($events->items());
    }

    /**
     * 新しいイベントを作成 (store)
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if (!$user || ($user->role !== 'artist' && $user->role !== 'admin')) {
            return response()->json(['message' => 'イベントを作成する権限がありません'], 403);
        }

        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date|after:now',
            'image_url' => 'nullable|string',
        ]);

        $eventData = $validatedData;
        $eventData['artist_id'] = $user->id;

        $event = Event::create($eventData);

        return response()->json($event, 201);
    }

    /**
     * 特定のイベント詳細を取得 (show)
     */
    public function show($id)
    {
        // ★★★ 修正箇所 ★★★
        // avatar_url -> image_url に変更し、存在しない name を削除
        $event = Event::with(['artist:id,nickname,image_url', 'ticketTypes'])
            ->findOrFail($id);

        return response()->json([
            'event' => $event,
            'tickets' => $event->ticketTypes,
            'is_owner' => Auth::id() === $event->artist_id,
        ]);
    }

    /**
     * イベント情報を更新 (update)
     */
    public function update(Request $request, Event $event)
    {
        $user = Auth::user();

        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => '権限がありません'], 403);
        }

        if (Carbon::parse($event->event_date)->isPast()) {
            return response()->json(['message' => '終了したイベントは編集できません'], 403);
        }

        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date',
            'image_url' => 'nullable|string',
        ]);

        $event->update($validatedData);

        return response()->json($event);
    }

    /**
     * イベントを削除 (destroy)
     */
    public function destroy(Event $event)
    {
        $user = Auth::user();

        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'このイベントを削除する権限がありません'], 403);
        }

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
