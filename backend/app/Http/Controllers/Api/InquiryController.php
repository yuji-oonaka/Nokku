<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inquiry\StoreInquiryRequest;
use App\Models\Event;
use App\Models\Inquiry;
use App\Models\InquiryResponse; // ★追加
use App\Models\User;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InquiryController extends Controller
{
    /**
     * 自分の問い合わせ一覧を取得
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $inquiries = $user
            ->inquiries()
            ->latest()
            ->with(['target'])
            ->paginate(10);

        return response()->json($inquiries);
    }

    /**
     * 新しいお問い合わせを保存する
     */
    public function store(StoreInquiryRequest $request)
    {
        $validated = $request->validated();

        // Organizer (対応責任者) の自動解決
        $organizerId = null;

        if ($request->target_type === Event::class) {
            $event = Event::find($request->target_id);
            $organizerId = $event?->artist_id;
        } elseif ($request->target_type === User::class) {
            $organizerId = $request->target_id;
        } elseif ($request->target_type === Order::class) {
            $order = Order::with('items.product')->find($request->target_id);
            $product = $order?->items->first()?->product;
            $organizerId = $product?->artist_id;
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $inquiry = $user->inquiries()->create([
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'target_type' => $request->target_type,
            'target_id' => $request->target_id,
            'organizer_id' => $organizerId,
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'お問い合わせを受け付けました。',
            'inquiry' => $inquiry
        ], 201);
    }

    /**
     * 問い合わせ詳細を表示 (返信履歴も含む)
     */
    public function show($id)
    {
        // ★修正: responses（返信履歴）も一緒に取得
        $inquiry = Inquiry::with(['target', 'organizer', 'responses.user'])
            ->findOrFail($id);

        if ($inquiry->user_id !== Auth::id()) {
            abort(403, '権限がありません。');
        }

        return response()->json($inquiry);
    }

    /**
     * ★追加: ユーザーからの返信メッセージ送信
     */
    public function sendMessage(Request $request, $id)
    {
        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $inquiry = Inquiry::where('user_id', Auth::id())->findOrFail($id);

        // 解決済みの場合は送らせない（仕様によるが、今回は禁止とする）
        if ($inquiry->status === 'closed') {
            return response()->json(['message' => 'このお問い合わせは解決済みです。'], 403);
        }

        // メッセージを保存
        $response = InquiryResponse::create([
            'inquiry_id' => $inquiry->id,
            'user_id' => Auth::id(),
            'is_admin' => false, // ユーザーからの送信
            'body' => $request->body,
        ]);

        // ステータスを「open（未対応）」に戻す
        // （ユーザーから返信が来た＝運営が見るべき状態になったため）
        if ($inquiry->status !== 'open') {
            $inquiry->update(['status' => 'open']);
        }

        return response()->json([
            'message' => 'メッセージを送信しました。',
            'data' => $response,
            'inquiry_status' => 'open'
        ]);
    }

    /**
     * ユーザー自身が問い合わせを解決済みにする
     */
    public function close($id)
    {
        $inquiry = Inquiry::findOrFail($id);

        if ($inquiry->user_id !== Auth::id()) {
            abort(403, '権限がありません。');
        }

        // ★修正: 解決日時と削除予定日時(1年後)も記録する
        $inquiry->update([
            'status' => 'closed',
            'closed_at' => now(),
            'expires_at' => now()->addYear(), // 1年後に削除
        ]);

        return response()->json([
            'message' => 'お問い合わせを解決済みにしました。',
            'inquiry' => $inquiry
        ]);
    }
}
