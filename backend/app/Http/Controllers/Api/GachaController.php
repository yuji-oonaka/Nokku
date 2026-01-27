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
        ]);

        $userId = Auth::id();
        $gachaId = $request->input('gacha_id');

        try {
            // ロジックはすべて Service に任せる
            // これにより PointService やログ記録が確実に実行される
            $result = $this->gachaService->spin($userId, $gachaId);

            return response()->json([
                'result' => [
                    'item' => [
                        'id' => $result['item']->id,
                        'name' => $result['item']->name,
                        'image_url' => $result['item']->image_url,
                        'rarity' => $result['item']->rarity,
                    ],
                    'is_duplicate' => $result['is_duplicate'],
                    'refund_amount' => $result['refund_amount'],
                ],
                'user_points' => $result['remaining_points'],
            ]);
        } catch (Exception $e) {
            // サービス層で投げられた例外を適切にエラーレスポンスとして返す
            return response()->json([
                'message' => $e->getMessage() ?: 'ガチャ実行中にエラーが発生しました。'
            ], 400);
        }
    }
}
