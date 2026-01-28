# 💳 サブスクリプション (Subscription) モジュール詳細

## 核心ロジック: `SubscriptionController`
 に基づく実装事実。

### 1. 「おかわり (Renew)」と「アップグレード (Upgrade)」
* **即時決済ロジック:** 同一プランまたは上位プランへの `swapAndInvoice` を実行。
* **サイクルリセット:** `billing_cycle_anchor => 'now'` を指定することで、次回更新日を今日にリセットし、即時満額請求＋ポイント付与（Listener経由）を誘発させる。
* **日割りなし:** `proration_behavior => 'none'` により、差額返金などが発生しない「払い直し」仕様。

### 2. ステータス同期
* **Stripe同期:** `status` メソッドで `asStripeSubscription()` を呼び出し、Stripe側の最新の次回更新日(`current_period_end`)をアプリへ返す。

### 🚩 地雷注意
* **ポイント付与タイミング:** このController内には「ポイント付与」のロジックは存在しない。Stripeの支払い完了イベントを `GrantSubscriptionPoints` リスナーがキャッチして付与する非同期フローを忘れるな。
* **二重契約ガード:** `subscribed('default')` チェックにより、Checkout Sessionの重複作成を防いでいる。