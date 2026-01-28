# 👤 ユーザー・プロファイル (User) モジュール詳細

## 核心ロジック: `UserController`
 に基づく実装事実。

### 1. プロフィール表示と制限
* **リレーション:** `show` および `update` 時に `currentIcon`, `currentFrame`, `currentBackground` を自動ロードする。
* **更新制限:** `role` が `artist` または `admin` でない場合、`image_url` の更新は強制的に除外（unset）される。

### 2. インベントリと変身 (Icon)
* **所持品:** `items` メソッドは `user_profile_items` テーブルから取得日(`obtained_at`)順にアイテムを返す。
* **アイコン変更:** `updateIcon` では、まず `user_profile_items` にそのアイテムが存在するか（所持しているか）を厳格にチェックする。

### 🚩 地雷注意
* **所持チェックのバイパス:** `updateIcon` のバリデーションは `profile_items` テーブルの存在確認のみ。必ずその後の「所持チェック」ロジックを通すこと。
* **アバター初期値:** 新規ユーザー登録直後の `current_icon_id` が未設定（null）の場合のフロントエンド表示に注意。