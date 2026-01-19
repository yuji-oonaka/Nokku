# 📱 NOKKU (ノック) - ライブイベント・グッズ販売プラットフォーム

![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)

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

### 💻 運営管理ダッシュボード (Web Admin)
運営スタッフは、**Laravel Filament** で構築された管理画面から、売上分析やイベント・グッズのCMS管理を行えます。

<div align="center">
  <img src="https://github.com/user-attachments/assets/e2f549ab-adf2-4ed2-982d-f9125cb98758" width="100%" alt="Filament Dashboard" style="border-radius: 8px;">
</div>


<br>
(※画像は開発中の画面です。ダークモードUIを採用し、没入感を高めています)

---
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

## ⚡ 主要機能 (Features)

* **🎫 イベント・チケット機能**
    * ライブ情報の閲覧・検索・Stripe決済による即時購入
    * **スマート入場システム**: 巨大QRコード表示、リアルタイム入場判定、Haptic Feedback（振動）による完了通知
* **🛍 グッズ販売 (Eコマース)**
    * 事前予約決済（クレカ）＆現地現金払いのハイブリッド対応
    * **転売対策**: 1人あたりの購入数制限機能
    * **QR引換**: スタッフ向けスキャナーによる在庫ステータスのリアルタイム反映
* **💬 コミュニティチャット**
    * イベントごとの掲示板（ロビー）
    * スレッド（ルーム）作成機能 **（※作成コスト: 50pt）**
    * リアルタイムチャット（削除、リプライ、リアクション、メンション機能）
    * **ハイブリッド課金モデル**
        * 各ルーム 10回まで送信無料
        * 以降は 1メッセージにつき 5pt 消費 **（※通貨価値未定のため、テスト用の仮設定値）**
        * スパム防止の連投制限（5秒）
* **💎 ポイントシステム**
    * ユーザー所持ポイントの管理（排他制御実装済み）
    * 汎用的な取引履歴ログ（チャット、ルーム作成、将来のガチャ等に対応）
    * マイページでの残高表示（Apple Wallet風UI）
* **🛡️ カスタマーサポート (Support)**
    * **対話型チャットUI**: ユーザーと運営がLINE風の画面でスムーズに質疑応答
    * **コンテキスト連携**: 特定の「注文」や「イベント」を紐付けて問い合わせ可能（ポリモーフィック関連）
    * **データライフサイクル管理**: 解決済みデータの保存期限管理と、バッチ処理による自動削除機能
* **🛠 アーティスト/運営管理 (Admin)**
    * イベント・グッズ・お知らせのCMS機能
    * **入場/引換スキャナー**: 権限チェック付きのQR読み取りカメラ内蔵
    * 売上・入場者数のリアルタイム管理 (**Laravel Filament**)

---

## 📘 利用・運用マニュアル (User & Admin Guide)

実際のライブ会場での運用を想定し、ユーザー（ファン）向けおよび運営スタッフ向けの利用マニュアルを整備しています。

**[📄 完全版マニュアルを見る (PDF)](https://github.com/user-attachments/files/24613966/NOKKU.pdf)**

<div align="center" style="display: flex; justify-content: center; gap: 10px;">
  <img src="https://github.com/user-attachments/assets/856c6168-a9e6-4ef4-9f9b-1964cae8c550" width="48%" alt="Manual Cover">
  <img src="https://github.com/user-attachments/assets/12b8908c-af53-494f-af5b-6d59b107cdeb" width="48%" alt="Manual Intro">
</div>

### 運用フローの設計
単なる機能実装に留まらず、現場でのオペレーションとセキュリティを考慮した役割分担を行っています。

* **User Flow:** チケット購入 → QR表示 → 当日入場までのスムーズなUX
* **Staff Flow:** 専用アプリによる「入場スキャン・物販消込」のみに特化した現場動線（管理画面へのアクセス遮断）
* **Operator Flow:** 顧客個人情報や売上データには触れず、「お問い合わせ対応」のみに集中できる安全な運用フロー

---

## 🛠 技術スタック (Tech Stack)

本プロジェクトは **Feature-Based Design** を採用し、AIディレクションのもと保守性の高いアーキテクチャで構築されています。

| カテゴリ | 技術・ライブラリ |
| :--- | :--- |
| **Frontend** | React Native, TypeScript |
| **State / API** | React Query (@tanstack/react-query), Axios |
| **UI / UX** | React Native Vector Icons, Haptic Feedback, React Native Sound |
| **Hardware** | React Native Vision Camera (QR Scan), QRCode SVG |
| **Backend** | Laravel 11 (PHP 8.4), **Filament (Admin Panel)** |
| **Database** | MySQL 8.0 (Main), Firestore (Realtime Chat) |
| **Infra** | Docker (Laravel Sail), WSL2 |
| **Auth** | Firebase Authentication |
| **Payment** | Stripe (Payment Intents API) |

---

## 📂 ディレクトリ構成 (Directory Structure)

Backend (Laravel) と Frontend (React Native) を単一リポジトリで管理するモノレポ構成を採用しています。

```text
nokku/
├── backend/                # Laravel API & Admin Panel
│   ├── app/
│   │   ├── Filament/       # Admin Resource Definitions
│   │   │   ├── Resources/  # Event, Order, Product, User Resources
│   │   │   └── Widgets/    # Dashboard Widgets
│   │   └── Http/           # API Controllers
│   ├── docker/             # PHP 8.4 + gRPC Custom Dockerfile
│   └── docker-compose.yaml # Laravel Sail Configuration
│
└── frontend/               # React Native Client App
    ├── app/                # Application Root (React Native)
    │   ├── android/        # Android Native Code
    │   ├── ios/            # iOS Native Code
    │   └── src/            # TypeScript Source Code
    └── package.json        # Script Wrapper

```

---

## 🚀 環境構築 (Setup)

> [!NOTE]
> **開発環境の最適化について**
> 本プロジェクトは **Windows (WSL2)** と **PowerShell** を組み合わせたハイブリッド環境で構築しています。
> (BackendはDocker on WSL2、FrontendはWindowsネイティブで動作させることで、ビルドパフォーマンスを最大化しています)

### 前提条件

* **OS**: Windows 10/11 (WSL2環境) または macOS
* **Docker Desktop**: 必須
* **Node.js**: v18以上 / **JDK**: 17以上
* **Android Studio**: エミュレータまたは実機デバッグ環境

### セットアップ手順 (Windows推奨)

Windows環境では、パフォーマンス最適化のため **BackendをWSL2**、**FrontendをPowerShell** で分離して実行することを推奨しています。

**1. Backend (WSL2)**

初回のみ、依存パッケージのインストールと初期設定が必要です。

```bash
# WSL2ターミナルで実行
cd backend

# 1. 環境変数の準備
cp .env.example .env

# 2. 依存パッケージのインストール (Docker経由で実行)
# ※ローカルにPHP/Composerがない場合でも動作するように、Dockerコンテナを使用してインストールします
docker run --rm \
    -u "$(id -u):$(id -g)" \
    -v "$(pwd):/var/www/html" \
    -w /var/www/html \
    laravelsail/php84-composer:latest \
    composer install --ignore-platform-reqs

# 3. コンテナの起動
./vendor/bin/sail up -d

# 4. アプリケーションキー生成 & マイグレーション & ストレージリンク
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan storage:link
./vendor/bin/sail artisan migrate:fresh --seed

```

**2. Frontend (PowerShell)**

```powershell
# PowerShellで実行
cd frontend

# 環境変数の準備
cp .env.example .env

# 依存パッケージのインストール
npm install

```

### macOS / Linux の場合

リポジトリ直下の `setup.sh` を使用して一括構築が可能です。

```bash
chmod +x setup.sh
./setup.sh

```

---

## ▶️ サーバー起動・開発コマンド

開発時は2つのターミナル（WSL2とPowerShell）を使用します。

**1. バックエンド (WSL2)**

```bash
cd backend
./vendor/bin/sail up -d
# APIサーバー: http://localhost:8000
# 管理画面: http://localhost:8000/admin

```

**2. Frontend (PowerShell)**
`package.json` のスクリプトを経由して実行します。

```powershell
cd frontend

# Metro Bundlerの起動
npm run start

# Androidアプリのビルドと起動
npm run android
```

---

### 🔐 管理画面・テスト用アカウント (Default Credentials)

データベースのシーディング (`migrate:fresh --seed`) により、以下のテスト用アカウントが作成されます。
Admin/Artist/OperatorはWeb管理画面を使用し、Staff/Userはアプリ側での操作確認に使用します。

サーバー起動 (`./vendor/bin/sail up -d`) 後、以下のURLからアクセス可能です。

| Role | Access Scope | Local URL | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | **Web (Full)** + App | http://localhost:8000/admin | `admin@nokku.com` | `password` |
| **Artist** | **Web (Owner)** + App | http://localhost:8000/admin | `artist@nokku.com` | `password` |
| **Operator** | **Web (Inquiry Only)** | http://localhost:8000/admin | `operator@nokku.com` | `password` |
| **Staff** | **App (Scanner)** Only | - | `staff@nokku.com` | `password` |
| **User** | **App (Customer)** Only | - | `user@nokku.com` | `password` |

> [!WARNING]
> これらのアカウント情報は **ローカル開発環境専用** です。
> 本番環境では使用されず、すべてダミーデータです。

> [!TIP]
> **役割ごとのアクセス制限について**
> * **Artist:** 自身が主催するイベント・売上データのみにスコープ（絞り込み）されます。
> * **Operator:** 「お問い合わせ対応」のみ可能です。売上情報やイベント編集にはアクセスできません。また、アプリへのログインは制限されています。
> * **Staff:** アプリでのチケットスキャン専用です。管理画面（Web）にはログインできません。
---

## 📱 実機テストの手順 (USB Debugging)

WSL2環境でのネットワーク接続を安定させるため、**USB接続 (adb reverse)** による実機テストを行っています。

1. **USB接続**: PCとAndroid端末をケーブルで接続し、USBデバッグをONにします。
2. **ポートフォワード設定**:
Android端末からPC(WSL2)のサーバーへアクセスするため、ポートを転送します。
```powershell
# Laravel Sail (Port 8000) と Metro Bundler (Port 8081) を転送
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081

```


3. **アプリ起動 (初回ビルド)**:
```powershell
cd frontend
npm run android

```

> [!TIP]
> **💡 日々の開発フロー (Hot Reload)**
> 一度アプリがインストールされた後は、毎回ビルド (`npm run android`) する必要はありません。
> **`npm start`** (Metro Bundler) を起動しておけば、ファイルの変更が即座に実機に反映されます。

---

## 💳 Stripe Configuration

決済機能をテストするには、StripeのAPIキー設定とWebhookの転送が必要です。

### 1. APIキーの設定 (.env)
Stripe Dashboard (Test Mode) からAPIキーを取得し、設定してください。

**Backend (`backend/.env`):**
```ini
STRIPE_KEY=pk_test_xxxxxxxx...      # 公開可能キー (Backendでも使用する場合)
STRIPE_SECRET=sk_test_xxxxxxxx...   # シークレットキー
STRIPE_WEBHOOK_SECRET=whsec_xxxx... # Webhook Secret (手順2で取得)

```

**Frontend (`frontend/.env`):**

```ini
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx... # 公開可能キー

```

### 2. Webhookの転送 (Stripe CLI)

ローカル環境で決済完了イベントを検知するために、Stripe CLIを使用してWebhookを転送します。

**① 転送の開始 (PowerShell)**:

```powershell
stripe listen --forward-to localhost:8000/api/stripe/webhook

```

**② キーの設定**:
出力された `whsec_...` キーを `backend/.env` の `STRIPE_WEBHOOK_SECRET` に設定してください。

**③ 設定の反映 (WSL2)**:

```bash
cd backend
./vendor/bin/sail artisan config:clear

```

## 🔌 External Services & Safety

本プロジェクトは外部APIと連携していますが、安全な検証環境で動作するように設計されています。

> [!NOTE]
> **課金・決済の安全性について**
> Stripeは **Test Mode** 環境で動作するため、実際のクレジットカード課金は発生しません。
> (テスト用カード番号: `4242 4242 4242 4242` 等を使用してください)

* **Stripe**: 決済インフラ（Payment Intents API）および Webhook 検証
* **Firebase**: 認証 (Auth) および リアルタイムチャット (Firestore)

---

## © Credits & License

© 2025 Yuji Oonaka

This project was designed, directed, and implemented by Yuji Oonaka.
Development was carried out with extensive use of generative AI tools
(ChatGPT, Gemini) under human-led architectural design and review.

All source code in this repository is released under the MIT License
unless otherwise noted.

