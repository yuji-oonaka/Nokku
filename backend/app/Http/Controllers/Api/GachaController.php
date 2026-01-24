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
        // ★修正: 'items.profileItem' ではなく 'items' だけを取得
        $gacha = Gacha::active()->with('items')->find($id);

        if (!$gacha) {
            return response()->json(['message' => 'ガチャが見つかりません。'], 404);
        }

        return response()->json([
            'id' => $gacha->id,
            'name' => $gacha->name,
            'description' => $gacha->description,
            'consumption_point' => $gacha->consumption_point,
            // ★修正: 多対多リレーションなので、$item がそのまま ProfileItem です
            'items' => $gacha->items->map(function ($item) {
                return [
                    'id' => $item->id,                  // $item->profileItem->id ではありません
                    'name' => $item->name,              // $item->profileItem->name ではありません
                    'image_url' => $item->image_url,
                    'rarity' => $item->rarity,
                    'is_pickup' => false,               // 中間テーブルにカラムがない場合は固定値またはpivotから取得
                    'probability_weight' => $item->pivot->weight, // pivotから重みを取得
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
            // 'required' を 'nullable' に変更し、送られてこなくてもOKにします
            'count' => 'nullable|integer|min:1',
        ]);

        // count が送られてこない場合は '1' をデフォルト値として使います
        $count = $request->input('count', 1);

        $user = $request->user();
        $gachaId = $request->input('gacha_id');

        // ★修正1: ガチャと、中身のアイテム(重み付き)を取得
        $gacha = Gacha::with('items')->findOrFail($gachaId);

        // ポイント不足チェック
        if ($user->points < $gacha->consumption_point) {
            return response()->json(['message' => 'ポイントが足りません'], 400);
        }

        // トランザクション開始（ポイント消費とアイテム付与を同時に行うため）
        return DB::transaction(function () use ($user, $gacha) {
            // 1. ポイント消費
            $user->decrement('points', $gacha->consumption_point);

            // ▼▼▼ 重み付き抽選ロジック ▼▼▼

            // A. 中身が空ならエラー
            if ($gacha->items->isEmpty()) {
                throw new \Exception('ガチャの中身が設定されていません。運営に報告してください。');
            }

            // B. 重みの合計値を計算 (例: 50 + 50 = 100)
            $totalWeight = $gacha->items->sum('pivot.weight');

            // C. 1〜合計値の間でランダムな数値を引く
            $random = mt_rand(1, $totalWeight);

            // D. 抽選ループ
            $currentWeight = 0;
            $selectedItem = null;

            foreach ($gacha->items as $item) {
                $currentWeight += $item->pivot->weight;

                // 現在の重み範囲内なら、このアイテムに決定
                if ($random <= $currentWeight) {
                    $selectedItem = $item;
                    break;
                }
            }
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            if (!$selectedItem) {
                throw new \Exception('抽選システムエラー');
            }

            // 3. 所持チェック & 付与
            // 既に持っているか確認
            $hasItem = $user->profileItems()->where('profile_item_id', $selectedItem->id)->exists();
            $isDuplicate = false;
            $refundAmount = 0;

            if ($hasItem) {
                // ★ダブりの場合：今回は「ポイント返却（半額）」などの救済措置を入れる例
                $isDuplicate = true;
                $refundAmount = floor($gacha->consumption_point / 2); // 半額還元
                $user->increment('points', $refundAmount);
            } else {
                // ★新規獲得の場合：所持品に追加
                // attach時に obtained_at (取得日) も入れると良いです
                $user->profileItems()->attach($selectedItem->id, ['obtained_at' => now()]);
            }

            // 4. 結果を返す
            return response()->json([
                'result' => [
                    'item' => $selectedItem,
                    'is_duplicate' => $isDuplicate,
                    'refund_amount' => $refundAmount,
                ],
                // クライアント側でポイント表示を即更新するために残高も返すのが親切
                'user_points' => $user->points,
            ]);
        });
    }
}
