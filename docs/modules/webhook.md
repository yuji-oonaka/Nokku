# 💳 決済Webhook (Stripe Webhook) モジュール詳細

## 核心ロジック: `StripeWebhookController`
 に基づく実装事実。

### 1. 決済成功ハンドリング
* `payment_intent.succeeded` イベントを受信した際、`metadata.order_id` を基に対象の `Order` を処理する。
* 重複処理防止のため、ステータスが `paid` または `completed` の場合は即座にリターンする。

### 2. ステータス遷移と発券
* 注文ステータスを `pending` から `paid` へ更新する。
* 更新直後に `TicketService@issueTicketsFromOrder` を呼び出し、デジタルチケットの実体を発行する。

### ✅ 解決済みの「地雷」
* **在庫の二重減算防止**: 以前は `TicketService` 側での減算リスクがあったが、現在は `StripeWebhookController` および `TicketService` 共に数量操作を排除。在庫操作は `OrderController` の一箇所に集約された。
* **トランザクションの原子性**: `DB::transaction` および `lockForUpdate` により、決済確定と発券処理は完全に不可分（Atomic）であることが確認済み。