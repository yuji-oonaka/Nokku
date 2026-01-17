<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inquiry\StoreInquiryRequest;
use App\Models\Event;
use App\Models\Inquiry;
use App\Models\User;
use App\Models\Order; // ★追加
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
            // ★追加: 注文の場合、その商品を出品したアーティストを責任者とする
            // 注文に紐づく商品のうち、最初の1つからアーティストを特定します
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
     * 問い合わせ詳細を表示
     */
    public function show($id)
    {
        $inquiry = Inquiry::with(['target', 'organizer'])
            ->findOrFail($id);

        if ($inquiry->user_id !== Auth::id()) {
            abort(403, '権限がありません。');
        }

        return response()->json($inquiry);
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

        $inquiry->update(['status' => 'closed']);

        return response()->json([
            'message' => 'お問い合わせを解決済みにしました。',
            'inquiry' => $inquiry
        ]);
    }
}
