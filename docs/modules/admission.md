# 🎟️ 入場・発券 (Admission) モジュール詳細

## 核心ロジック: ``TicketService``, ``TicketAdmissionService``, ``UserTicketController``
 に基づく実装事実。

### 1. 発券プロセス (Issuance)
* **座席番号の連番生成:** ``UserTicket::count()`` をベースに座席番号（例：S席-1）を自動生成する 。
* **Firestore初期同期:** 発券直後に ``TicketAdmissionService@syncToFirestore`` を呼び出し、ステータスを ``VALID`` でアプリ側へ即時反映させる 。

### 2. スキャン認可 (Verification)
* **アーティスト・スタッフ所属チェック:** ``scannerUser->role`` が ``staff`` の場合、雇用主(``employer_id``)がイベント主催者と一致するかまで確認する厳格な認可 。
* **二重入場ガード:** ``lockForUpdate`` を用い、同一QRの同時アクセスによる二重入場を物理的に防ぐ 。

### 🚩 【最重要地雷】在庫と定員の定義不整合
* **不整合の証拠:**
    * ``OrderController.php`` では、購入時に **``remaining_count``** を減算している 。
    * ``TicketService.php`` では、発券時に **``capacity``** を減算している 。
* **リスク:** チケットが売れるたびに「イベントの総定員(capacity)」自体が減っていく。定員変更ロジックは ``capacity`` を参照しているため、販売が進むほどマスタデータが破壊される。早急なロジック統一が必要。