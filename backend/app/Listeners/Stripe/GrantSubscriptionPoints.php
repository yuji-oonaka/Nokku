<?php

namespace App\Listeners\Stripe;

use App\Models\User;
use App\Models\PointTransaction;
use App\Services\PointService;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

class GrantSubscriptionPoints
{
    protected $pointService;

    // PointServiceを注入して使えるようにする
    public function __construct(PointService $pointService)
    {
        $this->pointService = $pointService;
    }

    /**
     * Webhookイベントごとの処理
     */
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload;

        // 対象イベント: 定期課金の支払い成功 (invoice.payment_succeeded)
        // ※これ以外のイベント（契約作成時など）は無視する
        if ($payload['type'] !== 'invoice.payment_succeeded') {
            return;
        }

        $data = $payload['data']['object'];
        $stripeCustomerId = $data['customer'] ?? null;
        $invoiceId = $data['id'] ?? null;
        $amountPaid = $data['amount_paid'] ?? 0; // 支払金額 (参考用)

        // 必須データがなければ中断
        if (!$stripeCustomerId || !$invoiceId) {
            return;
        }

        // 1. ユーザー特定 (Stripe ID から NOKKUユーザーを探す)
        $user = User::where('stripe_id', $stripeCustomerId)->first();
        if (!$user) {
            // Stripe側に顧客はいるが、DBにいないケース（通常ありえないが安全のため無視）
            return;
        }

        // 2. 冪等性(べきとうせい)チェック
        // 同じ Invoice ID で既にポイント付与済みなら、二重付与を防ぐためにスキップ
        // ※Stripeは稀に同じWebhookを2回送ってくることがあるため必須
        $processed = PointTransaction::where('type', PointTransaction::TYPE_SUBSCRIPTION)
            ->whereJsonContains('metadata->invoice_id', $invoiceId)
            ->exists();

        if ($processed) {
            Log::info("Stripe Webhook: Skipped duplicate invoice {$invoiceId}");
            return;
        }

        // 3. 付与ポイント数の決定
        // Stripeの商品設定(Metadata)から 'monthly_points' を読み取る
        $lines = $data['lines']['data'] ?? [];
        $pointsToAdd = 0;
        $planName = 'Unknown Plan';

        foreach ($lines as $line) {
            $price = $line['price'] ?? [];
            $metadata = $price['metadata'] ?? [];

            // メタデータに 'monthly_points' があれば加算
            if (isset($metadata['monthly_points'])) {
                $pointsToAdd += (int) $metadata['monthly_points'];
                $planName = $price['nickname'] ?? 'Subscription'; // 商品名
            }
        }

        // ポイント設定がない商品（ただの請求など）なら何もしない
        if ($pointsToAdd <= 0) {
            return;
        }

        // 4. ポイント付与実行 (PointService利用)
        try {
            $this->pointService->addPoints(
                $user->id,
                $pointsToAdd,
                PointTransaction::TYPE_SUBSCRIPTION, // 定義した定数
                "プラン特典: {$planName}",
                [
                    'invoice_id' => $invoiceId, // ★重複チェックの鍵
                    'stripe_amount' => $amountPaid,
                    'plan_name' => $planName
                ]
            );

            Log::info("Stripe Webhook: Granted {$pointsToAdd}pt to User {$user->id} (Invoice: {$invoiceId})");
        } catch (\Exception $e) {
            // エラー時はログに残す
            Log::error("Stripe Webhook Error: Failed to grant points. " . $e->getMessage());
        }
    }
}
