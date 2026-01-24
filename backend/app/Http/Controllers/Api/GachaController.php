<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gacha;
use App\Services\GachaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;

class GachaController extends Controller
{
    protected GachaService $gachaService;

    public function __construct(GachaService $gachaService)
    {
        $this->gachaService = $gachaService;
    }

    /**
     * 開催中のガチャ一覧を取得
     */
    public function index()
    {
        // 憲法遵守: 管理画面の「期間・公開設定」を反映
        $gachas = Gacha::active()
            ->select('id', 'name', 'description', 'consumption_point', 'end_at')
            ->get();

        return response()->json($gachas);
    }

    /**
     * ガチャ詳細と排出アイテム一覧を取得
     */
    public function show($id)
    {
        // ★修正: active() を追加し、期間外のガチャは詳細も見せない
        $gacha = Gacha::active()->with('items')->find($id);

        if (!$gacha) {
            return response()->json(['message' => '現在、このガチャは開催されていないか見つかりません。'], 404);
        }

        return response()->json([
            'id' => $gacha->id,
            'name' => $gacha->name,
            'description' => $gacha->description,
            'consumption_point' => $gacha->consumption_point,
            'items' => $gacha->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'image_url' => $item->image_url,
                    'rarity' => $item->rarity,
                    // 中間テーブルにカラムがある場合は $item->pivot->is_pickup 等で取得
                    'is_pickup' => $item->pivot->is_pickup ?? false,
                    'probability_weight' => $item->pivot->weight,
                ];
            }),
        ]);
    }

    /**
     * ガチャを回す (実行)
     */
    public function spin(Request $request)
    {
        $request->validate([
            'gacha_id' => 'required|exists:gachas,id',
            'count' => 'nullable|integer|min:1',
        ]);

        $user = $request->user();
        $gachaId = $request->input('gacha_id');

        // ★重要修正: 実行時も active() であることを厳守（不正防止）
        $gacha = Gacha::active()->with('items')->find($gachaId);

        if (!$gacha) {
            return response()->json(['message' => 'このガチャは現在終了しているか、無効になっています。'], 403);
        }

        // ポイント不足チェック
        if ($user->points < $gacha->consumption_point) {
            return response()->json(['message' => 'ポイントが足りません'], 400);
        }

        return DB::transaction(function () use ($user, $gacha) {
            // 1. ポイント消費 (再取得してロックをかけるのが理想だが、まずはデクリメント)
            $user->decrement('points', $gacha->consumption_point);

            // 2. 抽選ロジック
            if ($gacha->items->isEmpty()) {
                throw new \Exception('ガチャの中身が設定されていません。');
            }

            $totalWeight = $gacha->items->sum('pivot.weight');
            $random = mt_rand(1, $totalWeight);

            $currentWeight = 0;
            $selectedItem = null;

            foreach ($gacha->items as $item) {
                $currentWeight += $item->pivot->weight;
                if ($random <= $currentWeight) {
                    $selectedItem = $item;
                    break;
                }
            }

            if (!$selectedItem) {
                throw new \Exception('抽選システムエラー');
            }

            // 3. 所持チェック & 付与
            $hasItem = $user->profileItems()->where('profile_item_id', $selectedItem->id)->exists();
            $isDuplicate = false;
            $refundAmount = 0;

            if ($hasItem) {
                $isDuplicate = true;
                $refundAmount = floor($gacha->consumption_point / 2);
                $user->increment('points', $refundAmount);
            } else {
                $user->profileItems()->attach($selectedItem->id, ['obtained_at' => now()]);
            }

            // 4. 結果を返す
            return response()->json([
                'result' => [
                    'item' => [
                        'id' => $selectedItem->id,
                        'name' => $selectedItem->name,
                        'image_url' => $selectedItem->image_url,
                        'rarity' => $selectedItem->rarity,
                    ],
                    'is_duplicate' => $isDuplicate,
                    'refund_amount' => $refundAmount,
                ],
                'user_points' => $user->fresh()->points, // 最新のポイントを返す
            ]);
        });
    }
}
