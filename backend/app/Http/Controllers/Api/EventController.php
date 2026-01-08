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

        // N+1対策 & セキュリティ強化: artistの必要なカラムのみ取得
        // ここで password や email などを除外します
        $query = Event::with('artist:id,nickname,avatar_url,name');

        if ($filter === 'past') {
            $query->where('event_date', '<', $now)
                ->orderBy('event_date', 'desc');
        } else {
            $query->where('event_date', '>=', $now)
                ->orderBy('event_date', 'asc');
        }

        // ページネーションを追加 (パフォーマンス対策)
        // 全件取得(get)はデータ量が増えるとサーバーを圧迫するため避ける
        $events = $query->paginate(20);

        return response()->json($events->items()); // 配列のみ返す (paginateオブジェクト全体が必要なら $events そのままで)
    }

    /**
     * 新しいイベントを作成 (store)
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // 厳密な権限チェック
        if (!$user || ($user->role !== 'artist' && $user->role !== 'admin')) {
            return response()->json(['message' => 'イベントを作成する権限がありません'], 403);
        }

        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date|after:now', // 作成時は未来日付必須
            'image_url' => 'nullable|string',
        ]);

        $eventData = $validatedData;
        $eventData['artist_id'] = $user->id;

        $event = Event::create($eventData);

        return response()->json($event, 201);
    }

    /**
     * 特定のイベント詳細を取得 (show)
     * チケット情報もまとめて返すことで、フロントエンドの通信回数を減らす
     */
    public function show($id)
    {
        // 存在チェックを含めて検索
        // artist と ticketTypes をEager Loading
        $event = Event::with(['artist:id,nickname,avatar_url,name', 'ticketTypes'])
            ->findOrFail($id);

        return response()->json([
            'event' => $event,
            'tickets' => $event->ticketTypes, // フロントエンドの期待する構造に合わせる
            // 閲覧者がオーナーかどうかのフラグも便利なので追加
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

        // 過去イベントの編集禁止
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

        // トランザクション推奨 (関連データ削除のため)
        // 今回はシンプルにdelete
        $event->delete();

        return response()->json(null, 204);
    }

    /**
     * Deprecated: showメソッドに統合されたため非推奨
     * フロントエンドの修正が完了次第削除予定
     */
    public function getTicketTypes(Event $event)
    {
        $ticketTypes = $event->ticketTypes()->get();
        return response()->json($ticketTypes);
    }
}
