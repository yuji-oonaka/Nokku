# 📱 NOKKU (ノック) - ライブイベント・グッズ販売プラットフォーム

<div align="center">
  <img src="https://placehold.jp/30/333333/ffffff/800x400.png?text=NOKKU%20App%20Concept" width="100%" alt="NOKKU App Banner" />
</div>

<br>

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

## 📖 概要 (Overview)

**「ライブの熱狂を、手のひらから。」**

NOKKUは、アーティストとファンをシームレスに繋ぐ、ライブ特化型プラットフォームアプリです。
チケットの購入から、当日のスムーズな入場（QR認証）、グッズの事前予約・決済、そしてファン同士のチャットコミュニティまで、ライブ体験のすべてをこのアプリ一つで完結させます。

---

## 📸 スクリーンショット (Screenshots)

<div align="center" style="display: flex; gap: 10px; justify-content: center;">
  <img src="https://placehold.jp/150x300.png?text=Home" width="30%" alt="Home Screen" />
  <img src="https://placehold.jp/150x300.png?text=Ticket" width="30%" alt="Ticket QR" />
  <img src="https://placehold.jp/150x300.png?text=Admin" width="30%" alt="Admin Scan" />
</div>

---

## ⚡ 主要機能 (Features)

* **🎫 イベント・チケット機能**
    * ライブ情報の閲覧・検索・Stripe決済による即時購入
    * **スマート入場システム**: 巨大QRコード表示、リアルタイム入場判定、Haptic Feedback（振動）による完了通知
* **🛍 グッズ販売 (Eコマース)**
    * 事前予約決済（クレカ）＆現地現金払いのハイブリッド対応
    * **転売対策**: 1人あたりの購入数制限機能
    * **QR引換**: スタッフ向けスキャナーによる在庫ステータスのリアルタイム反映
* **💬 コミュニティチャット**
    * イベントごとの掲示板（ロビー）とスレッド作成
    * リアルタイムチャット（削除、リプライ、リアクション、メンション機能）
* **🛠 アーティスト/運営管理 (Admin)**
    * イベント・グッズ・お知らせのCMS機能
    * **入場/引換スキャナー**: 権限チェック付きのQR読み取りカメラ内蔵
    * 売上・入場者数のリアルタイム管理（Laravel Filament）

---

## 🛠 技術スタック (Tech Stack)

本プロジェクトは **Feature-Based Design** を採用し、AIディレクションのもと保守性の高いアーキテクチャで構築されています。

| カテゴリ | 技術・ライブラリ |
| :--- | :--- |
| **Frontend** | React Native (CLI 0.76), TypeScript |
| **State / API** | React Query (@tanstack/react-query), Axios |
| **UI / UX** | React Native Vector Icons, Haptic Feedback, React Native Sound |
| **Hardware** | React Native Vision Camera (QR Scan), QRCode SVG |
| **Backend** | Laravel 11 (PHP 8.4), Laravel Sail |
| **Database** | MySQL 8.0 (Main), Firestore (Realtime Chat) |
| **Infra** | Docker (gRPC対応カスタムイメージ), WSL2 |
| **Auth** | Firebase Authentication |
| **Payment** | Stripe (Payment Intents API) |

---

## 📂 ディレクトリ構成 (Directory Structure)

Backend (Laravel) と Frontend (React Native) を単一リポジトリで管理するモノレポ構成を採用しています。

```text
nokku/
├── backend/                # Laravel API & Admin Panel
│   ├── app/                # Controllers, Models, Services
│   ├── database/           # Migrations, Seeders
│   ├── docker/             # PHP 8.4 + gRPC Custom Dockerfile
│   └── docker-compose.yaml # Laravel Sail Configuration
│
└── frontend/               # React Native Client App
    └── app/
        ├── android/        # Android Native Code
        ├── ios/            # iOS Native Code
        └── src/            # TypeScript Source Code
            ├── api/        # API Definitions (React Query)
            ├── features/   # Feature-Based Design Modules
            ├── components/ # Shared UI Components
            ├── hooks/      # Custom Hooks
            ├── navigators/ # React Navigation Config
            └── services/   # External Services (Sound, Haptic)
