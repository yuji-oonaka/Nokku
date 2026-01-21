<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Exceptions\IncompletePayment;

class SubscriptionController extends Controller
{
    /**
     * 1. 新規契約 (Checkout Session)
     * まだ有料プランに入っていない人向け
     */
    public function checkout(Request $request)
    {
        $request->validate(['price_id' => 'required|string']);
        $user = $request->user();

        // 既に契約中の場合はエラーにする（またはポータルへ誘導）
        if ($user->subscribed('default')) {
            return response()->json(['message' => '既に契約済みです。プラン変更はマイページから行ってください。'], 400);
        }

        try {
            $checkout = $user->newSubscription('default', $request->input('price_id'))
                ->allowPromotionCodes()
                ->checkout([
                    'success_url' => route('subscription.success'),
                    'cancel_url' => route('subscription.cancel'),
                ]);

            return response()->json(['checkout_url' => $checkout->url]);
        } catch (\Exception $e) {
            Log::error('Checkout Error: ' . $e->getMessage());
            return response()->json(['message' => '作成失敗'], 500);
        }
    }

    /**
     * 2. 同プラン即時更新 (Renew / おかわり)
     * ポイントが尽きたので、更新日を今日にリセットして即時課金＆付与
     */
    public function renew(Request $request)
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription || !$subscription->valid()) {
            return response()->json(['message' => '有効な契約がありません'], 404);
        }

        try {
            // 現在のプランIDを取得
            $currentPrice = $subscription->asStripeSubscription()->items->data[0]->price->id;

            // 同じプランIDで swap することで「更新」扱いにする
            // billing_cycle_anchor => 'now': 更新日を今日にリセット（＝即時満額請求）
            // proration_behavior => 'none': 日割り計算なし
            $subscription->swapAndInvoice($currentPrice, [
                'billing_cycle_anchor' => 'now',
                'proration_behavior' => 'none',
            ]);

            return response()->json(['message' => 'プランを更新し、ポイントをチャージしました！']);
        } catch (IncompletePayment $e) {
            return response()->json(['message' => '決済に失敗しました。カード情報を確認してください。'], 402);
        } catch (\Exception $e) {
            Log::error('Renew Error: ' . $e->getMessage());
            return response()->json(['message' => '更新処理に失敗しました'], 500);
        }
    }

    /**
     * 3. 上位プランへ即時変更 (Upgrade)
     * 差額ではなく「満額」払い直しで即時VIP化
     */
    public function upgrade(Request $request)
    {
        $request->validate(['price_id' => 'required|string']);
        $user = $request->user();
        $newPriceId = $request->input('price_id');
        $subscription = $user->subscription('default');

        if (!$subscription || !$subscription->valid()) {
            return response()->json(['message' => '有効な契約がありません'], 404);
        }

        try {
            // ※ここで「本当に上位プランか？」のチェックロジックを入れるのが理想ですが
            // MVPではFrontend側で制御し、Backendは指示通り変更を実行します

            // 即時反映ロジックは Renew と同じ
            $subscription->swapAndInvoice($newPriceId, [
                'billing_cycle_anchor' => 'now',
                'proration_behavior' => 'none',
            ]);

            return response()->json(['message' => 'プランを変更しました！VIP特典が有効になります。']);
        } catch (IncompletePayment $e) {
            return response()->json(['message' => '決済に失敗しました。'], 402);
        } catch (\Exception $e) {
            Log::error('Upgrade Error: ' . $e->getMessage());
            return response()->json(['message' => '変更処理に失敗しました'], 500);
        }
    }

    /**
     * 4. 契約管理・ダウングレード (Portal)
     * 下位プラン変更や解約はここでやらせる
     */
    public function portal(Request $request)
    {
        $url = $request->user()->billingPortalUrl(route('subscription.success'));
        return response()->json(['portal_url' => $url]);
    }

    /**
     * 5. ステータス確認 (Status)
     * アプリ側でボタンを出し分けるための情報を返す
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        if (!$subscription || !$subscription->valid()) {
            return response()->json(['status' => 'none']);
        }

        // Stripeから最新情報を同期
        $stripeSub = $subscription->asStripeSubscription();

        return response()->json([
            'status' => 'active',
            'price_id' => $stripeSub->items->data[0]->price->id, // 現在のプラン
            'ends_at' => $subscription->ends_at,
            'current_period_end' => date('Y-m-d', $stripeSub->current_period_end), // 次回更新日
        ]);
    }

    // success(), cancel() メソッドは既存のままでOK
    public function success()
    {
        return view('subscription.success');
    }
    public function cancel()
    {
        return view('subscription.cancel');
    }
}
