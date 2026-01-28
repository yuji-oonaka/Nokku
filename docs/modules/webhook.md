# 💳 決済Webhook (Stripe Webhook) モジュール詳細

## 核心ロジック: `StripeWebhookController`
 に基づく実装事実。

### 1. 決済成功ハンドリング
* `payment_intent.succeeded` イベントを受信した際、`metadata.order_id` を基に対象の `Order` を処理する。
* 重複処理防止のため、ステータスが `paid` または `completed` の場合は即座にリターンする。

### 2. ステータス遷移と発券
* 注文ステータスを `pending` から `paid` へ更新する。
* 更新直後に `TicketService@issueTicketsFromOrder` を呼び出し、デジタルチケットの実体を発行する。

### 🚩 地雷注意
* **在庫の先行減算:** 在庫は `OrderController@store`（pending作成時）で既に減らされている。Webhook側で再度在庫を減らさないよう厳守。
* **チケット二重発行:** `TicketService` 呼び出しが `DB::transaction` 内にあることを確認せよ。失敗時は注文ステータス更新もロールバックされる。