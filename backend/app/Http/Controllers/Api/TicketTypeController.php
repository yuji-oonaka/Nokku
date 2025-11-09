<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TicketType; // 👈 1. TicketTypeモデルを use
use App\Models\Event; // 👈 2. Eventモデルを use（権限チェック用）
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth; // 👈 3. Authを use

class TicketTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     * (メモ: このAPIは今のところ使いませんが、将来の管理画面用に枠だけ作っておきます)
     */
    public function index()
    {
        // すべての券種を返す（管理画面用）
        $ticketTypes = TicketType::with('event')->get();
        return response()->json($ticketTypes);
    }

    /**
     * Store a newly created resource in storage.
     * (新しい券種「S席」などを作成する)
     */
    public function store(Request $request)
    {
        // 1. バリデーション
        $validatedData = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'name' => 'required|string|max:255',
            'price' => 'required|integer|min:0',
            'capacity' => 'required|integer|min:1',
            'seating_type' => 'required|in:random,free', // 'random' か 'free' のみ許可
        ]);

        $user = Auth::user();
        $event = Event::findOrFail($validatedData['event_id']);

        // 2. ★重要★ 権限チェック
        // ログイン中のユーザーが、このイベントの主催者(artist_id)と一致するか？
        // (または管理(admin)か？)
        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'このイベントの券種を作成する権限がありません'], 403);
        }

        // 3. DBに保存
        $ticketType = TicketType::create($validatedData);

        // 4. 作成した券種情報をJSONで返す
        return response()->json($ticketType, 201); // 201 Created
    }

    /**
     * Display the specified resource.
     */
    public function show(TicketType $ticketType) // ★ 修正： string $id から TicketType $ticketType に変更
    {
        // ★ 実装： 権限チェック (destroy と同じ)
        $user = Auth::user();
        $event = $ticketType->event; // 親イベントを取得
        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この券種を閲覧する権限がありません'], 403);
        }
        
        return response()->json($ticketType);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TicketType $ticketType) // ★ 修正： string $id から TicketType $ticketType に変更
    {
        // ★ 実装： 権限チェック (destroy と同じ)
        $user = Auth::user();
        $event = $ticketType->event; // 親イベントを取得
        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この券種を編集する権限がありません'], 403);
        }

        // ★ 実装： バリデーション (store とほぼ同じ)
        // ※ event_id は更新対象外（券種が別のイベントに移動することはない）
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|integer|min:0',
            'capacity' => 'required|integer|min:1',
            'seating_type' => 'required|in:random,free',
        ]);

        // ★ 実装： データ更新
        $ticketType->update($validatedData);

        // ★ 実装： 更新後のデータを返す
        return response()->json($ticketType);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TicketType $ticketType) // 👈 string $id を TicketType $ticketType に変更
    {
        $user = Auth::user();
        
        // 1. この券種（$ticketType）が属する親イベント（Event）を取得
        $event = $ticketType->event; // (Event.php へのリレーションを使います)

        // 2. 権限チェック
        // (ログイン中のユーザーが、このイベントの主催者か、または管理者か)
        if ($user->id !== $event->artist_id && $user->role !== 'admin') {
            return response()->json(['message' => 'この券種を削除する権限がありません'], 403);
        }

        // 3. 削除処理
        // (関連する UserTicket も DB設定(onDelete('cascade'))により自動で削除されます)
        $ticketType->delete();

        // 4. 成功レスポンス
        return response()->json(null, 204); // 204 No Content
    }
}