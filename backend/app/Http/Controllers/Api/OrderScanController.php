<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\UserTicket;
// ★ 成功しているチケット機能と同じ Facade を使う
use Kreait\Laravel\Firebase\Facades\Firebase;

class OrderScanController extends Controller
{
    public function redeem(Request $request)
    {
        $targetId = $request->input('order_item_id') ?? $request->input('qr_code_id');

        if (!$targetId) {
            return response()->json(['message' => 'IDが必要です'], 422);
        }

        /** @var \App\Models\User $artist */
        $artist = Auth::user();

        if ($artist->role !== 'artist' && $artist->role !== 'admin') {
            return response()->json(['message' => 'この操作を行う権限がありません'], 403);
        }

        $orderItem = null;

        if (Str::isUuid($targetId)) {
            $order = Order::where('qr_code_id', $targetId)->first();
            if ($order) {
                $orderItem = $order->items->first();
            }
        } else {
            $orderItem = OrderItem::find($targetId);
        }

        if (!$orderItem) {
            $isTicket = UserTicket::where('qr_code_id', $targetId)->exists();
            if ($isTicket) {
                return response()->json([
                    'message' => 'これは入場チケット用のQRコードです。「チケット入場」モードに切り替えてください。'
                ], 400);
            }
            return response()->json(['message' => '該当する注文が見つかりません'], 404);
        }

        $orderItem->load('product');
        $product = $orderItem->product;

        if ($artist->role !== 'admin') {
            if (!$product || $product->artist_id !== $artist->id) {
                return response()->json([
                    'message' => '権限がありません。他者のイベントのグッズは引き換えできません。'
                ], 403);
            }
        }

        if ($orderItem->order && $orderItem->order->status === 'redeemed') {
            return response()->json(['message' => '既に引き換え済みの注文です'], 409);
        }

        if ($orderItem->order && $orderItem->order->delivery_method !== 'venue') {
            return response()->json(['message' => 'この注文は会場受取りではありません'], 422);
        }

        // DB更新
        if ($orderItem->order) {
            $orderItem->order->update(['status' => 'redeemed']);

            // ★ Firestore 更新
            if ($orderItem->order->qr_code_id) {
                try {
                    // ★ 変更: app() ではなく、チケットと同じ Facade を使う
                    // これでインスタンスがキャッシュされ、初期化ループを回避できるはずです
                    $firestore = Firebase::firestore();
                    $database = $firestore->database();

                    $database->collection('order_status')
                        ->document($orderItem->order->qr_code_id)
                        ->set([
                            'status' => 'redeemed',
                            'updatedAt' => date('c'), // 安全のため文字列化は維持
                            'scanner_id' => (int)$artist->id
                        ]);
                } catch (\Exception $e) {
                    Log::error('Firestore update failed: ' . $e->getMessage());
                    // 失敗してもスキャン自体は成功させる
                }
            }
        }

        return response()->json([
            'message' => '引き換えが完了しました',
            'order' => $orderItem->order ? $orderItem->order->load('items', 'user') : null,
            'data' => $orderItem
        ]);
    }
}