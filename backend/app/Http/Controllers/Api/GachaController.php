<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gacha;
use App\Services\GachaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        // scopeActive() を使って有効なものだけ取得
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
        $gacha = Gacha::active()->with(['items.profileItem'])->find($id);

        if (!$gacha) {
            return response()->json(['message' => 'ガチャが見つかりません。'], 404);
        }

        return response()->json([
            'id' => $gacha->id,
            'name' => $gacha->name,
            'description' => $gacha->description,
            'consumption_point' => $gacha->consumption_point,
            'items' => $gacha->items->map(function ($item) {
                return [
                    'id' => $item->profileItem->id, // アイテム自体のID
                    'name' => $item->profileItem->name,
                    'image_url' => $item->profileItem->image_url,
                    'rarity' => $item->profileItem->rarity,
                    'is_pickup' => $item->is_pickup,
                    'probability_weight' => $item->probability_weight,
                    // 景表法対応などで確率(%)を出す場合はここで計算しても良い
                ];
            }),
        ]);
    }

    /**
     * ガチャを回す (実行)
     */
    public function spin(Request $request, $id)
    {
        $user = Auth::user(); // FirebaseAuth Middlewareを通ったユーザー

        try {
            // Serviceに委譲
            $result = $this->gachaService->spin($user->id, (int)$id);

            return response()->json([
                'message' => 'ガチャを回しました！',
                'result' => $result, // item, is_duplicate, remaining_points 等が含まれる
            ]);
        } catch (Exception $e) {
            // ポイント不足や無効なガチャなどのエラー
            return response()->json([
                'message' => $e->getMessage(),
                'error_type' => 'gacha_error'
            ], 400);
        }
    }
}
