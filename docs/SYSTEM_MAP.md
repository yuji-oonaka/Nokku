# 🗺️ NOKKU 開発地雷原マップ (索引)

## 📌 モジュール別詳細 (Fact-Based)
各ファイルの中身を精査済みの詳細ドキュメントです。

* [🔐 認証・認可](modules/auth.md) - Firebase連携・Operator排除
* [📦 商取引 (Commerce)](modules/commerce.md) - 在庫減算・Stripe予約
* [💳 決済連携 (Webhook)](modules/webhook.md) - ステータス確定・チケット発行
* [🔍 スキャンシステム (Scanning)](modules/scanning-system.md) - **QR自動判別・定員/在庫の減算不整合注意**
* [🖼️ ストレージ・物流](modules/storage.md) - 画像フォルダ振分・保存
* [📦 グッズ管理 (Merchandise)](modules/merchandise.md) - カタログ・権限ガード
* [🎟️ 入場・発券 (Admission)](modules/admission.md) - **重大な在庫不整合警告あり**
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

## 🚨 横断監査・警告ドキュメント（必読・修正前提）

* [🧪 在庫・数量ロジック 精密監査（報告）](audit/inventory-audit-report.md)  
  - チケット在庫消失・定員破壊の原因を**コードレベルで確定**
  - backend / frontend 両方に影響あり
  - **修正・仕様変更前に必読**

  ↳ 調査ログ・根拠資料：  
  [inventory-audit-raw.md](audit/inventory-audit-raw.md)

---

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

---

### 🚨 修正が必要な「現行のねじれ」について (最重要)

本ドキュメント化プロジェクトによって発見された、NOKKUにおける**最大の論理バグ**です。

| 処理場所 | 操作対象カラム | 実装されている内容 | 判定 |
| --- | --- | --- | --- |
| `OrderController` | `remaining_count` | 注文時に「残り枚数」を減算 | **正解** ✅ |
| `TicketService` | **`capacity`** | 発券時に **「総定員」** を減算 | **バグ** ❌ |

> **緊急のアドバイス:** > 現在の実装では、チケットが売れるたびに「イベントの総定員」そのものが減っていきます。これにより、後から定員を増やしたり、販売状況を正確に把握することが困難になります。
> **対策:** `TicketService.php` 内の減算対象を `remaining_count` に修正するか、もしくは `OrderController` での減算に一本化し、`TicketService` では減算を行わない設計へ変更せよ。

---