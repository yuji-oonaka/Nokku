
---

# 📦 商取引 (Commerce) モジュール詳細：Ver 2.0

## 核心ロジック: `OrderController@store`

### 1. 在庫の統合管理

* 商品 (`Product`) とチケット (`TicketType`) を同一の `store` メソッド内で制御します。
* 在庫チェックには `lockForUpdate()` を使用し、秒間多数のリクエストが重なってもオーバーセル（売り越し）を物理的に発生させない設計です。

### 2. トランザクション・シークエンス

1. **悲観的ロックによる在庫確保**: `remaining_count` または `stock` を `decrement`（減算）し、決済前に在庫を「仮押さえ」します。
2. **注文レコードの永続化**: `Order` および `OrderItem` を作成し、購入時の価格（`price_at_purchase`）を記録します。
3. **決済予約**: Stripe `PaymentIntent` を作成し、フロントエンドへ `clientSecret` を返却します。
4. **★【NEW】リアルタイム通知**: 会場受取（`venue`）の場合は、この時点で Firestore の `order_status` コレクションへ「未引換」の状態を同期します。

* ※ 全工程を `DB::transaction` で包んでいるため、エラー発生時は在庫減算も注文作成もすべてロールバックされます。

### ✅ 解決済みの「ねじれ」

* **Webhookとの整合性**: 以前は発券時（Webhook側）に在庫を減らすリスクがありましたが、現在は `OrderController` で一括減算し、Webhook 側は「ステータス更新」のみに専念する形に整理されました。
* **在庫復元の保証**: 支払期限切れやキャンセル時に `CancelExpiredOrders` が正しく `increment`（復元）を行うことで、在庫の「蒸発」問題は解消済みです。

---