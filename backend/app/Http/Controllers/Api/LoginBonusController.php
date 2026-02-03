<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoginBonusHistory;
use App\Models\PointTransaction;
use App\Models\LoginBonusConfig;
use App\Services\PointService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LoginBonusController extends Controller
{
    protected $pointService;

    public function __construct(PointService $pointService)
    {
        $this->pointService = $pointService;
    }

    /**
     * ログインボーナスを受け取る
     */
    public function claim(Request $request)
    {
        $user = $request->user();

        // スタッフとオペレーターは対象外にする
        // ポイントは「顧客」または「オーナー(Artist)」のためのもの。
        // 業務従事者(Staff/Operator)には付与しない。
        if (in_array($user->role, ['staff', 'operator'])) {
            return response()->json([
                'claimed' => false,
                'message' => 'スタッフアカウントは対象外です。',
            ]);
        }

        $config = LoginBonusConfig::where('is_active', true)->first();
        $bonusPoints = $config ? $config->amount : 5;
        $today = Carbon::today()->format('Y-m-d');

        // 1. 簡易チェック (Read)
        // 既に今日取得済みなら早期リターンしてDB負荷を下げる
        $exists = LoginBonusHistory::where('user_id', $user->id)
            ->where('awarded_date', $today)
            ->exists();

        if ($exists) {
            return response()->json([
                'claimed' => false,
                'message' => '本日のログインボーナスは取得済みです。',
                'current_points' => $user->points,
            ]);
        }

        try {
            // 2. トランザクション実行 (Write)
            return DB::transaction(function () use ($user, $today, $bonusPoints) {

                // 履歴作成
                // unique制約('user_id', 'awarded_date')があるため、重複時はここで例外が発生しガードされる
                LoginBonusHistory::create([
                    'user_id' => $user->id,
                    'points' => $bonusPoints,
                    'awarded_date' => $today,
                ]);

                // ポイント付与 (Service利用)
                $this->pointService->addPoints(
                    $user->id,
                    $bonusPoints,
                    PointTransaction::TYPE_LOGIN_BONUS,
                    'ログインボーナス',
                    ['date' => $today]
                );

                // 更新後のポイントを取得して返す
                return response()->json([
                    'claimed' => true,
                    'message' => "ログインボーナス {$bonusPoints}pt を獲得しました！",
                    'awarded_points' => $bonusPoints,
                    'current_points' => $user->fresh()->points,
                ]);
            });
        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
            // タッチの差で重複リクエストが来た場合の安全策
            return response()->json([
                'claimed' => false,
                'message' => '本日のログインボーナスは取得済みです。',
            ]);
        } catch (\Exception $e) {
            Log::error('Login Bonus Error: ' . $e->getMessage());
            return response()->json(['message' => 'エラーが発生しました。'], 500);
        }
    }
}
