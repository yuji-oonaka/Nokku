# 📦 商取引 (Commerce) モジュール詳細

## 核心ロジック: `OrderController@store`
 に基づく実装事実。

### 1. 在庫の二重管理
* 商品(`Product`)とチケット(`TicketType`)を同一の `store` メソッドで処理。
* 在庫チェックには `lockForUpdate()` を使用し、悲観的ロックをかけている。

### 2. 処理シーケンス（重要）
1. Stripe `PaymentIntent` 作成（決済予約）
2. **在庫減算 (`decrement`)** ← ここで在庫を確保
3. `Order` および `OrderItem` レコード作成
4. 完了レスポンス

### 🚩 地雷注意
* 在庫減算が `Order::create` より先に行われるため、途中で例外が発生すると在庫だけ減って注文がない状態になる（トランザクションで保護されているが、Webhook側で二重減算しないよう注意）。