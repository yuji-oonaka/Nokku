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
EOF

# 3. Points & Gacha（ポイント・ガシャ）の詳細
cat << 'EOF' > docs/modules/points_gacha.md
# 💎 ポイント・ガシャ (Points & Gacha) モジュール詳細

## 核心ロジック: `PointService`, `GachaService`
 に基づく実装事実。

### 1. ポイントの整合性
* `PointTransaction` には必ず `balance_after`（取引後残高）を記録。
* これにより、ユーザーテーブルの `points` と履歴の不整合を検知可能。

### 2. ガシャ重複還元ロジック
* `isDuplicate` 判定後、当選ガシャ価格の **50% (0.5)** をポイント返金するロジックが `GachaService` にハードコードされている。

### 🚩 地雷注意
* 返金処理は `PointService@addPoints` を内部で呼んでいる。ガシャのトランザクション内で失敗すると、ポイント消費だけが残り、景品も返金も得られないリスクがある。
EOF

# 4. Admission（入場・引換）の詳細
cat << 'EOF' > docs/modules/admission.md
# 🎟️ 入場・引換 (Admission) モジュール詳細

## 核心ロジック: `TicketAdmissionService`
 に基づく実装事実。

### 1. Firestore 同期義務
* DB（MySQL）のステータス更新後、必ず `syncToFirestore` を実行する。
* Firestore側のコレクション名は、チケットなら `ticket_status`、グッズ引換なら `order_status` と使い分けている。

### 2. ロールベースのガード
* `admin`, `artist`, `staff` のロールのみ許可。
* アーティスト/スタッフの場合、自身の担当イベント以外のQRは弾くロジックが組み込まれている。

### 🚩 地雷注意
* Firestore同期はトランザクション外（処理の最後）で行われる。同期に失敗してもDB側は `USED` になるため、アプリ側の表示更新が遅れる可能性がある。
EOF