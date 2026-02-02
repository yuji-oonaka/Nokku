
---

# 💎 サブスクリプション (Subscription) モジュール詳細：Ver 2.0

## 核心ロジック: `SubscriptionController`, `GrantSubscriptionPoints`

### 1. おかわり・アップグレードの挙動

* **仕様**: サイクルを強制リセットし即時満額請求を行う (`swapAndInvoice`)。
* **挙動**: `billing_cycle_anchor` を `now` に設定し、日割り計算（Proration）を無効化することで、決済直後に満額ポイントを付与する。
* **意図**: ユーザーが「今すぐポイントが欲しい」と思った瞬間に、複雑な計算なしに即時チャージされる体験を優先。

### 2. ポイント付与の信頼性

* **仕様**: Stripeの `invoice.payment_succeeded` Webhookに同期して `GrantSubscriptionPoints` (内部的には `PointService`) を実行。
* **安全性**: `invoice_id` による冪等性チェックにより、通信エラーによる再送時も二重付与を完全に防止。

### 🛡️ 運用上の「新・鉄則」 (旧地雷を撤去済み)

これまでの「Stripeメタデータへの依存」を廃止し、**バックエンドDBを唯一の真実**としました。

* **DB主権カタログ**: 付与ポイント数、価格、表示名、UIカラーはすべて `subscription_plans` テーブルで管理する。
* **Stripeとの紐付け**: DB側の `stripe_price_id` と Stripe側の `Price ID` さえ一致していれば、メタデータの同期作業は不要。
* **運用の流れ**:
1. Stripe で新しい価格プランを作成。
2. Filament（管理画面）で `SubscriptionPlan` を新規作成し、その `Price ID` を登録。
3. **即座にアプリ側へ反映完了。** アプリのアップデートもメタデータの書き換えも不要。

---