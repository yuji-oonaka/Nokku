# 🎟️ 入場・発券 (Admission) モジュール詳細

## 核心ロジック: ``TicketService``, ``TicketAdmissionService``, ``UserTicketController``

### 1. 発券プロセス (Issuance)
* **座席番号の連番生成:** ``UserTicket::count()`` をベースに座席番号（例：S席-1）を自動生成する。
* **Firestore初期同期:** 発券直後に ``TicketAdmissionService@syncToFirestore`` を呼び出し、ステータスを ``VALID`` でアプリ側へ即時反映させる。

### 2. スキャン認可 (Verification)
* **アーティスト・スタッフ所属チェック:** ``scannerUser->role`` が ``staff`` の場合、雇用主(``employer_id``)がイベント主催者と一致するかまで確認する厳格な認可。
* **二重入場ガード:** ``lockForUpdate`` を用い、同一QRの同時アクセスによる二重入場を物理的に防ぐ。

### ✅ 在庫と定員の管理定義 (解決済み)
* **設計原則:** `capacity`（定員）は不変のマスタデータとし、`remaining_count`（在庫）のみを増減対象とする。
* **実装事実:**
    * `OrderController.php`: 購入時に `remaining_count` を減算（在庫確保）。
    * `CancelExpiredOrders.php`: 期限切れ時に `remaining_count` を加算（在庫復元）。
    * `TicketService.php`: 発券時は数量操作を行わない（二重減算の防止）。