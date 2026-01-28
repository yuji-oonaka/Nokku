# 🗺️ NOKKU 開発地雷原マップ (索引)

## 📌 モジュール別詳細 (Fact-Based)
各ファイルの中身を精査済みの詳細ドキュメントです。

* [📦 商取引 (Commerce)](modules/commerce.md) - 在庫減算・Stripe連携
* [💎 ポイント・ガシャ](modules/points_gacha.md) - 返金ロジック・残高監査
* [🎟️ 入場・引換](modules/admission.md) - Firestore同期・権限チェック
* [💬 チャット](modules/chat.md) - 無料枠・連投制限・課金ロジック

## 🛠️ 基本プロトコル
1. ポイント消費は必ず `PointService` を通す。
2. Firestore同期を伴う処理は `TicketAdmissionService` のパターンを踏襲する。
3. 複雑なDB操作は必ず `DB::transaction` と `lockForUpdate` をセットで使う。
EOF