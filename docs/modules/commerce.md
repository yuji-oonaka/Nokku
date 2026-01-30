# 📦 商取引 (Commerce) モジュール詳細

## 核心ロジック: `OrderController@store`

### 1. 在庫の統合管理
* 商品(`Product`)とチケット(`TicketType`)を同一の `store` メソッドで排他制御。
* 在庫チェックには `lockForUpdate()` を使用し、オーバーセルを物理的に防止。

### 2. トランザクション・シークエンス
1. **悲観的ロックによる在庫確保**: `remaining_count` または `stock` を `decrement`。
2. **注文レコードの永続化**: `Order` および `OrderItem` を作成。
3. **決済予約**: Stripe `PaymentIntent` を作成し、`clientSecret` を返却。
* ※ 全工程を `DB::transaction` で包んでいるため、不完全な注文データは発生しない。

### ✅ 解決済みの「ねじれ」
* **Webhookとの整合性**: 以前は発券処理（Webhook側）での二重減算リスクがあったが、`TicketService` のロジックを修正し、数量操作を `OrderController` に集約したことで解決済み。
* **在庫復元の保証**: 期限切れキャンセル時に `CancelExpiredOrders` が正しく在庫を戻すようになり、在庫の「蒸発」も解消された。