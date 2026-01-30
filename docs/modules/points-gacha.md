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