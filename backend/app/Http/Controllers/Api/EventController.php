<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event; // 忘れずにEventモデルを use
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // ログインユーザー情報取得のため use

class EventController extends Controller
{
    /**
     * イベント一覧を取得 (index)
     */
    public function index()
    {
        // シンプルに全てのイベントを新しい順で返す
        $events = Event::orderBy('event_date', 'desc')->get();
        
        return response()->json($events);
    }

    /**
     * 新しいイベントを作成 (store)
     */
    public function store(Request $request)
    {
        // ログイン中のユーザー情報を取得
        $user = Auth::user(); 

        // 権限チェック：アーティストまたは管理者でなければ作成できない
        if ($user->role !== 'artist' && $user->role !== 'admin') {
            return response()->json(['message' => 'イベントを作成する権限がありません'], 403); // 403 Forbidden
        }

        // バリデーション (設計書で定義済み)
        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'event_date' => 'required|date',
            'price' => 'required|integer|min:0',
            'total_tickets' => 'required|integer|min:1',
        ]);

        // バリデーション済みデータに、作成者(アーティスト)のIDを追加
        $eventData = $validatedData;
        $eventData['artist_id'] = $user->id;

        // DBに保存 (Eventモデルの $fillable がここで効いてきます)
        $event = Event::create($eventData);

        // 作成したイベント情報をJSONで返す
        return response()->json($event, 201); // 201 Created
    }

    /**
     * 特定のイベント詳細を取得 (show)
     * (今回はまだ実装しないので、中身は空のまま)
     */
    public function show(string $id)
    {
        //
    }

    /**
     * イベント情報を更新 (update)
     * (今回はまだ実装しないので、中身は空のまま)
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * イベントを削除 (destroy)
     * (今回はまだ実装しないので、中身は空のまま)
     */
    public function destroy(string $id)
    {
        //
    }
}