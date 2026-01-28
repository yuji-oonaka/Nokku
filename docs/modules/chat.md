# 💬 チャット (Chat) モジュール詳細

## 核心ロジック: `ChatService`, `EventChatController`
 に基づく実装事実。

### 1. メッセージ送信 (`consumeMessage`)
* **無料枠:** `FREE_LIMIT = 10`。同一ユーザー・同一ルーム内の成功ログが10件未満なら消費ポイントは 0。
* **有料枠:** 11件目から `MESSAGE_COST = 5` を消費。
* **連投制限:** `SPAM_INTERVAL = 5` 秒。短時間のリクエストは `STATUS_FAILED` として記録され `429` を返却。

### 2. ルーム作成 (`consumeRoomCreate`) ★実装完了
* **消費ポイント:** `ROOM_CREATION_COST = 50` 固定。
* **処理フロー:** `PointService@consumePoints` で `chat_room_create` として減算。
* **ログ記録:** `room_id = 0` として `UserChatLog` に「Room Created: [部屋名]」を記録。
* **エラー対応:** ポイント不足時は `402 Payment Required` を返却。

### 🚩 地雷注意
* **ルームID 0 の予約:** `room_id = 0` はシステムによるルーム作成ログとして予約されている。通常のメッセージ送信と混同しないこと。
* **Firestoreとの不整合:** DB側でポイント減算とログ作成が成功しても、フロントエンド側でFirestoreへのルーム作成が失敗した場合、ユーザーはポイントを失ったままになる。リトライロジックに注意。