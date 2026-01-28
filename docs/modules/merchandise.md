# 📦 グッズ管理 (Merchandise) モジュール詳細

## 核心ロジック: ``ProductController``
 に基づく実装事実。

### 1. 認可と整合性
* **Policyによるガード:** ``store``, ``update``, ``destroy`` の全てにおいて、``AuthorizesRequests`` トレイトを用いた厳格な権限チェックが実行される 。
* **在庫情報の保護:** グッズ削除時、画像の物理削除は ``Observer`` に委ねられており、Controller層ではビジネスロジックに集中している 。

### 2. 表示ロジックの工夫
* **いいね(Favorite)連動:** 一覧(`index`)および詳細(`show`)取得時に、``withCount`` で ``likes_count`` を、``withExists`` で ``is_liked``（自分がいいね済みか）を1クエリで取得し、パフォーマンスを最適化している 。

### 🚩 地雷注意
* **注文ロジックとの分離:** 在庫の減算は ``OrderController@store`` で行われる 。``ProductController@update`` で在庫数を手動変更する際、未完了の注文(`pending`)との整合性に注意せよ。