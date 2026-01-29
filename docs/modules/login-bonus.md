# 🎁 ログインボーナス (Login Bonus) モジュール詳細

## 核心ロジック: ``LoginBonusController``
 に基づく実装事実。

### 1. 付与対象の厳格化
* **顧客・オーナー限定:** 業務従事者（``staff``, ``operator``）には付与しないガードロジック。ポイントはあくまでファンとアーティストのためのものである。

### 2. 重複防止の二段構え
* **Readガード:** 履歴テーブル（``login_bonus_histories``）をチェックし、既に本日分が存在すれば早期リターン。
* **Writeガード:** DBの ``unique('user_id', 'awarded_date')`` 制約を利用。トランザクション内でのタッチの差による重複を ``UniqueConstraintViolationException`` で確実に弾く。

### 🚩 地雷注意
* **ポイント数:** 1日あたり ``5pt`` 固定。変更時は Controller 内のハードコード箇所の修正が必要。
* **付与タイミング:** フロントエンド側の ``useLoginBonus`` フックとの連携。ログイン時に自動で ``claim`` を叩く仕様を前提としている。