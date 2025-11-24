# NOKKU (ノック) - ライブイベント・グッズ販売プラットフォーム

<div align="center">
  <img src="https://placehold.jp/30/333333/ffffff/600x300.png?text=NOKKU%20App%20Image" width="100%" alt="NOKKU App Banner" />
</div>

**「ライブの熱狂を、手のひらから。」**

NOKKUは、アーティストとファンをシームレスに繋ぐ、ライブ特化型プラットフォームアプリです。
チケットの購入から、当日のスムーズな入場（QR認証）、グッズの事前予約・決済、そしてファン同士のチャットコミュニティまで、ライブ体験のすべてをこのアプリ一つで完結させます。

---

## 目次

1. [主要機能](#主要機能)
2. [技術スタック](#技術スタック)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [環境構築](#環境構築)
5. [サーバー起動・開発コマンド](#サーバー起動・開発コマンド)
6. [実機テストの手順](#実機テストの手順)
7. [Stripe Webhook設定](#stripe-webhook設定)

---

## 主要機能

* **イベント・チケット**:
    * ライブ情報の閲覧、検索
    * Stripe決済によるチケット購入
    * **入場専用画面**: 巨大QRコード表示、リアルタイム入場判定、完了音・振動フィードバック
* **グッズ (Eコマース)**:
    * グッズの閲覧、お気に入り登録、購入（クレジット/現地現金）
    * **購入制限機能**: 転売対策（1人あたりの購入数制限）
    * **引換システム**: QRコードによる現地受け渡しとステータスのリアルタイム反映
* **チャット**:
    * イベントごとの掲示板（ロビー）とスレッド作成
    * リアルタイムチャット（削除、リプライ、リアクション、メンション機能）
* **アーティスト/運営機能**:
    * イベント・グッズ・お知らせの作成・編集
    * **スキャナー**: チケット入場・グッズ引換のQR読み取り（権限チェック付き）
    * 売上管理（バックエンド）

[▲ 目次に戻る](#目次)

---

## 技術スタック

| カテゴリ | 技術・サービス |
| :--- | :--- |
| **フロントエンド** | React Native (0.76), TypeScript |
| **状態管理・通信** | React Query (@tanstack/react-query), Axios |
| **UI/演出** | React Native Vector Icons, React Native Sound, Haptic Feedback |
| **カメラ・QR** | React Native Vision Camera, React Native QRCode SVG |
| **バックエンド** | Laravel 11 (PHP 8.4), Laravel Sail |
| **データベース** | MySQL 8.0 (メイン), Google Cloud Firestore (リアルタイム) |
| **インフラ** | Docker (gRPC対応カスタムイメージ), WSL2 |
| **認証** | Firebase Authentication |
| **決済** | Stripe (Payment Intents API) |

[▲ 目次に戻る](#目次)

---

## ディレクトリ構成

本プロジェクトは `backend` (Laravel) と `frontend` (React Native) を一つのリポジトリで管理するモノレポ構成です。

nokku/ ├── backend/ # Laravel API & Admin │ ├── app/ # コントローラー、モデル等 │ ├── database/ # マイグレーション、Seeder │ ├── docker/ # PHP 8.4 + gRPC カスタムDockerfile │ └── docker-compose.yaml # Sail設定 │ ├── frontend/ │ └── app/ # React Native プロジェクトルート │ ├── android/ # Androidネイティブコード │ ├── ios/ # iOSネイティブコード │ └── src/ # TypeScriptソースコード │ ├── api/ # API定義 (queries.ts) │ ├── components/ # UI部品 │ ├── hooks/ # カスタムフック (useImageUpload 等) │ ├── navigators/ # 画面遷移設定 │ ├── screens/ # 各画面コンポーネント │ └── services/ # api.ts, SoundService.ts │ ├── README.md └── setup.sh # 自動環境構築スクリプト


[▲ 目次に戻る](#目次)

---

## 環境構築

### 前提条件

* **OS**: Windows 10/11 (WSL2 - Ubuntu推奨) または macOS
* **Docker Desktop**: 必須
* **Node.js**: v18以上
* **Java (JDK)**: Androidビルド用 (JDK 17推奨)
* **Android Studio**: エミュレータまたは実機デバッグ環境

### 自動セットアップ

リポジトリ直下の `setup.sh` を使用すると、バックエンドのコンテナ起動からDB構築、フロントエンドの依存関係インストールまでを一括で行えます。

```bash
chmod +x setup.sh
./setup.sh
手動設定 (重要)
スクリプト実行後、以下の設定ファイルを手動で配置・編集する必要があります。

1. バックエンド (backend/.env)
Firebaseの秘密鍵ファイル (firebase_credentials.json) を backend/storage/app/ に配置し、パスを指定してください。

コード スニペット

STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (Stripe CLIで取得)

FIREBASE_CREDENTIALS=storage/app/firebase_credentials.json
2. フロントエンド (frontend/app/.env)
実機テストを行う場合は、API_URL をPCのローカルIPアドレスに変更してください。

コード スニペット

STRIPE_PUBLISHABLE_KEY=pk_test_...
▲ 目次に戻る

サーバー起動・開発コマンド
開発時は以下の2つのターミナルを開いて実行します。

1. バックエンド (Laravel Sail)
Bash

cd backend
./vendor/bin/sail up -d
APIサーバー: http://localhost:80 (またはPCのIPアドレス)

2. フロントエンド (Metro Bundler)
Bash

cd frontend/app
npx react-native start
3. アプリのインストール (Android)
Bash

cd frontend/app
npx react-native run-android
▲ 目次に戻る

実機テストの手順
QRコードスキャン機能を確認するには実機が必要です。

ネットワーク設定: PCとスマホを同じWi-Fiに接続する。

IPアドレス確認: PCのIPアドレス (例: 192.168.1.10) を確認し、backend/.env の APP_URL と frontend/app/src/services/api.ts の baseURL を書き換える。

キャッシュクリア: cd backend && ./vendor/bin/sail artisan config:clear

インストール: スマホをUSB接続し、npx react-native run-android。

接続先設定: アプリ起動後、シェイクしてメニューを開き、Settings > Debug server host... に 192.168.1.10:8081 を入力。

▲ 目次に戻る

Stripe Webhook設定
決済完了を確実に検知するためにWebhookを使用しています。

Stripe CLI をインストールし、ログインする。

以下のコマンドでローカルへの転送を開始する。

Bash

stripe listen --forward-to localhost/api/stripe/webhook
表示された whsec_... から始まるシークレットキーを、backend/.env の STRIPE_WEBHOOK_SECRET に設定する。

./vendor/bin/sail artisan config:clear を実行する。

▲ 目次に戻る