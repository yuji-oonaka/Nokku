# 🗺️ NOKKU 開発地雷原マップ (索引)

## 📌 モジュール別詳細 (Fact-Based)
各ファイルの中身を精査済みの詳細ドキュメントです。

* [🔐 認証・認可](modules/auth.md) - Firebase連携・Operator排除
* [📦 商取引 (Commerce)](modules/commerce.md) - 在庫減算・Stripe予約
* [💳 決済連携 (Webhook)](modules/webhook.md) - ステータス確定・チケット発行
* [🔍 スキャンシステム (Scanning)](modules/scanning-system.md) - **整合性確保済み・在庫管理憲法準拠**
* [🖼️ ストレージ・物流](modules/storage.md) - 画像フォルダ振分・保存
* [📦 グッズ管理 (Merchandise)](modules/merchandise.md) - カタログ・権限ガード
* [🎟️ 入場・発券 (Admission)](modules/admission.md) - **整合性確保済み**
* [💎 サブスクリプション](modules/subscription.md) - おかわり課金・サイクルリセット
* [📢 お知らせ・タイムライン](modules/Announcements.md) - 公開日時・権限別表示フィルタ
* [🎁 ログインボーナス](modules/login-bonus.md) - Staff除外・5pt・重複ガード
* [⭐ お気に入り](modules/favorites.md) - トグル登録・いいね数カウント
* [💎 ポイント・ガシャ](modules/points-gacha.md) - 50%返金・残高監査
* [💬 チャット](modules/chat.md) - 50ptルーム作成・スパムガード
* [👤 ユーザー](modules/user.md) - 所持アイテムチェック
* [🎟️ イベント・アーティスト](modules/event-management.md) - 表示最適化
* [📩 問い合わせ](modules/inquiry.md) - 自動解決・ライフサイクル

---

## ✅ 横断監査・完了報告

* [🧪 在庫・数量ロジック 精密監査（報告）](audit/inventory-audit-report.md)
  - **解決済み**: チケット在庫消失・定員破壊の修正を完了。
  - **適用済み**: backend (Order/Ticket/Cron) のロジックを憲法に基づき統一。

  ↳ 調査ログ・根拠資料：
  [inventory-audit-raw.md](audit/inventory-audit-raw.md)

---

## 🛠️ NOKKU 黄金プロトコル (基本合意)

### 1. ポイント操作の「監査」義務

ポイントの増減は、直接 `users.points` を触ることを厳禁とする。

* **鉄則:** 必ず `PointService` を使用し、全増減を `point_transactions` に記録すること。
* **理由:** 取引後残高 (`balance_after`) を不変ログとして刻むことが、NOKKU経済圏の透明性における生命線である。

### 2. 在庫操作の「悲観的ロック」義務

同時アクセスによる在庫の過剰販売（オーバーセル）を物理的に防ぐ。

* **鉄則:** 数量が絡む DB 更新（注文・発券・ガシャ等）時は、必ず `DB::transaction` 内で **`lockForUpdate()`** を実行すること。

### 3. ハイブリッド DB の「Firestore 同期」義務

アプリ側のリアルタイム表示を MySQL 側と一致させる。

* **鉄則:** ステータス更新（入場・引換完了等）後は、必ず `TicketAdmissionService@syncToFirestore` を呼び出すこと。
* **注意:** 同期失敗で全体の処理を止めないよう、`try-catch` による **Silent Catch（握り潰し＋ログ出力）** を徹底する。

### 4. ロール別の「機能制限」義務

スタッフ等が一般ユーザーの特典を不正取得することを防ぐ。

* **鉄則:** `LoginBonus` 等の還元機能では、必ず `staff`, `operator` ロールを除外するガードを入れること。

### 5. 在庫・定員の完全分離義務
* **鉄則:** `capacity` はイベント作成時以外、自動で変動させてはならない。
* **鉄則:** 在庫の増減は `remaining_count` に対してのみ行い、「注文（減）」と「キャンセル（戻し）」で一対のサイクルを形成すること。

---