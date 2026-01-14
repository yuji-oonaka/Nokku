# 📱 NOKKU (ノック) - ライブイベント・グッズ販売プラットフォーム

![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)

> **Note: Target Platform**
> 本プロジェクトは **Windows (WSL2)** 環境下で開発を行っているため、現在は **Android** をメインターゲットとして最適化・実機検証を行っています。
> (React Native製のため、macOS環境があればiOSビルドも可能です)

**[📄 仕様書 (Notion)](https://Notionのリンク)**

チケット購入、入場管理、そして熱狂の共有まで。ライブ体験のすべてを手のひらで完結させる、オールインワン・プラットフォームです。

<div align="center">
  <img width="100%" alt="Nokku Concept" src="https://github.com/user-attachments/assets/5a21a3e3-485b-4f4e-a5f9-8b5f87b63be4" />
</div>
<br>

**主な機能と画面イメージ:**

<div align="center" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
  <img src="https://github.com/user-attachments/assets/d07395ba-cc85-4228-af05-e2f5e6db06c0" width="30%" alt="Screen 1">
  <img src="https://github.com/user-attachments/assets/e87b31ac-69a0-46d4-af13-9ba46e6c967a" width="30%" alt="Screen 2">
  <img src="https://github.com/user-attachments/assets/efb8330c-f11e-4a13-a6f8-acedc814a03f" width="30%" alt="Screen 3">
</div>

<br>
(※画像は開発中の実機画面です。ダークモードUIを採用し、没入感を高めています)

---
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

## 📘 利用・運用マニュアル (User & Admin Guide)

実際のライブ会場での運用を想定し、ユーザー（ファン）向けおよび運営スタッフ向けの利用マニュアルを整備しています。

**[📄 完全版マニュアルを見る (PDF)](https://github.com/user-attachments/files/24613966/NOKKU.pdf)**

<div align="center" style="display: flex; justify-content: center; gap: 10px;">
  <img src="https://github.com/user-attachments/assets/856c6168-a9e6-4ef4-9f9b-1964cae8c550" width="48%" alt="Manual Cover">
  <img src="https://github.com/user-attachments/assets/12b8908c-af53-494f-af5b-6d59b107cdeb" width="48%" alt="Manual Intro">
</div>

### 運用フローの設計
単なる機能実装に留まらず、現場でのオペレーションを考慮した設計を行っています。
* **User Flow:** 準備 → 購入 → 当日入場までのUXを最適化
* **Admin Flow:** 入場スキャン・物販消込のスタッフ動線を確立
---

## 🛠 技術スタック (Tech Stack)

本プロジェクトは **Feature-Based Design** を採用し、AIディレクションのもと保守性の高いアーキテクチャで構築されています。

| カテゴリ | 技術・ライブラリ |
| :--- | :--- |
| **Frontend** | React Native, TypeScript |
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

```

---

## 🚀 環境構築 (Setup)

### 前提条件

* **OS**: Windows 10/11 (WSL2 - Ubuntu推奨) または macOS
* **Docker Desktop**: 必須
* **Node.js**: v18以上 / **JDK**: 17以上
* **Android Studio**: エミュレータまたは実機デバッグ環境

### 自動セットアップ

リポジトリ直下の `setup.sh` を使用すると、環境構築を一括で行えます。

```bash
chmod +x setup.sh
./setup.sh

```

### 手動設定 (重要)

スクリプト実行後、`.env` ファイルの設定が必要です。

**1. バックエンド (`backend/.env`)**
Firebaseの秘密鍵 (`firebase_credentials.json`) を `backend/storage/app/` に配置してください。

```ini
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_CREDENTIALS=storage/app/firebase_credentials.json

```

**2. フロントエンド (`frontend/app/.env`)**
実機テストを行う場合は、`API_URL` をPCのローカルIPアドレスに変更してください。

```ini
API_URL=[http://192.168.](http://192.168.)x.x/api
STRIPE_PUBLISHABLE_KEY=pk_test_...

```

---

## ▶️ サーバー起動・開発コマンド

開発時は以下の2つのターミナルを開いて実行します。

**1. バックエンド (Laravel Sail)**

```bash
cd backend
./vendor/bin/sail up -d
# APIサーバー: http://localhost:80

```

**2. フロントエンド (Metro Bundler)**

```bash
cd frontend/app
npx react-native start

```

**3. アプリ起動 (Android)**

```bash
cd frontend/app
npx react-native run-android

```

---

## 📱 実機テストの手順

カメラ機能（QRスキャン）の確認には実機が必要です。

1. **ネットワーク**: PCとスマホを同じWi-Fiに接続。
2. **IP設定**: PCのIPを確認し、`.env` の `API_URL` を書き換える。
3. **キャッシュクリア**: `cd backend && ./vendor/bin/sail artisan config:clear`
4. **起動**: スマホをUSB接続し `npx react-native run-android`
5. **デバッグメニュー**: アプリ起動後、シェイクしてメニューを開き `Settings` > `Debug server host...` に `192.168.x.x:8081` を入力。

---

## 💳 Stripe Webhook設定

決済検知のため、Stripe CLIでの転送が必要です。

```bash
stripe listen --forward-to localhost/api/stripe/webhook

```

出力された `whsec_...` キーを `backend/.env` に設定し、キャッシュをクリアしてください。
