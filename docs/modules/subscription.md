# 💎 サブスクリプション (Subscription) モジュール詳細

## 核心ロジック: `SubscriptionController`, `GrantSubscriptionPoints`

### 1. おかわり・アップグレードの挙動
* **仕様**: サイクルを強制リセットし即時満額請求を行う (`swapAndInvoice`)。※期間のロスは仕様であり、NOKKUでは問題としない
* **意図**: 日割り計算によるポイント付与の複雑化を避け、ユーザーが「支払った瞬間に満額ポイントを得る」体験を優先。

### 2. ポイント付与の信頼性
* **仕様**: Stripeの `invoice.payment_succeeded` Webhookに同期して `PointService` を実行。
* **安全性**: `invoice_id` による冪等性チェックを実装済み。二重付与を防止。

### 🚨 運用上の「地雷」 (重要)
* **メタデータ同期**: 付与ポイント数は Stripe Price 側の `monthly_points` メタデータに依存する。
* **鉄則**: 新しいプランを Stripe に作成する際は、必ず `subscriptionData.ts` の定義とメタデータを一致させること。