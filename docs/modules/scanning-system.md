# 🔍 スキャン・入場システム (Scanning System) モジュール詳細

## 核心ロジック: ``TicketAdmissionService``, ``OrderScanController``に基づく実装事実。

### 1. QRコードの自動判別ロジック
* **フォールバック機能:** チケットスキャン時にチケットが見つからない場合、自動的に ``Order`` テーブルを検索する。
* **利便性:** グッズ引換用QRを誤ってチケットスキャナーで読み込んだ場合、適切なエラー（「グッズ引換モードにしてください」）を返却する 。

### 2. 厳格な認可プロトコル (RBAC)
* **スタッフ所属チェック:** ``scannerUser->role`` が ``staff`` の場合、雇用主（``employer_id``）がイベントの主催アーティスト（``artist_id``）と一致しているかを厳密に検証する。
* **二重入場・引換の防止:** ``lockForUpdate`` による悲観的ロックを実行。DB更新（``USED`` または ``completed``）後にレスポンスを返すことで、同一QRによる同時入場を物理的に防ぐ。

### 3. ハイブリッド同期 (MySQL & Firestore)
* **Firestore同期義務:** MySQLの更新に成功した後、必ず ``syncToFirestore`` を呼び出す。
* **リアルタイム反映:** チケットなら ``ticket_status``、グッズなら ``order_status`` コレクションへ、スキャナーID付きで即座に反映させる。

### ✅ 在庫と定員の整合性 (2026/01/30 修正完了)
* **憲法準拠:** ``capacity`` (定員) はマスタデータとして不変を保ち、在庫操作は ``remaining_count`` に一本化されている。
* **責務の分離:**
    * **注文時 (OrderController):** ``remaining_count`` を減算して在庫を確保する。
    * **キャンセル時 (CancelExpiredOrders):** ``remaining_count`` をインクリメントして在庫を復元する。
    * **発券時 (TicketService):** 数量操作を行わず、チケットの実体生成のみに専念する。