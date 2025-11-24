---

### 2. `setup.sh` (テキスト版)

```bash
#!/bin/bash

# エラーが発生したら停止
set -e

echo "🚀 NOKKU 環境構築を開始します..."

# ==========================================
# 1. バックエンド (Laravel) の構築
# ==========================================
echo "--- 1. バックエンド (Laravel) を構築中... ---"
cd backend

# .env の作成
if [ ! -f .env ]; then
    echo "📄 .envファイルを作成します..."
    cp .env.example .env
else
    echo "📄 .envファイルは既に存在します。"
fi

# コンテナのビルドと起動
# (初回は時間がかかります)
echo "🐳 Sailコンテナをビルドして起動します..."
# PHP 8.4 + gRPC のカスタムDockerを使うため、必ず build する
./vendor/bin/sail up -d --build

# DBの起動待ち
echo "⏳ データベースの起動を待っています..."
timeout=60
count=0
until ./vendor/bin/sail exec mysql mysqladmin ping --silent; do
    sleep 1
    count=$((count+1))
    if [ $count -ge $timeout ]; then
        echo "❌ データベースが起動しませんでした。"
        exit 1
    fi
    echo -n "."
done
echo ""
echo "✅ データベースの準備が完了しました。"

# アプリケーションキー生成
echo "🔑 アプリケーションキーを生成します..."
./vendor/bin/sail artisan key:generate

# ストレージリンク
echo "🔗 ストレージリンクを作成します..."
./vendor/bin/sail artisan storage:link

# マイグレーション & シーディング
echo "🌱 データベースを構築し、テストデータを投入します..."
./vendor/bin/sail artisan migrate:fresh --seed

echo "✅ バックエンドの構築が完了しました！"
echo ""

# ==========================================
# 2. フロントエンド (React Native) の構築
# ==========================================
echo "--- 2. フロントエンド (React Native) を構築中... ---"
cd ../frontend/app

# .env の作成 (なければ)
if [ ! -f .env ]; then
    echo "📄 .envファイルを作成します (テンプレートからコピー)..."
    # .env.example があればコピー、なければ空作成の警告
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "⚠️ .env.example が見つかりません。手動で .env を作成してください。"
        touch .env
    fi
fi

# パッケージインストール
echo "📦 npmパッケージをインストールします..."
npm install

echo "✅ フロントエンドの構築が完了しました！"
echo ""

# ==========================================
# 完了メッセージ
# ==========================================
echo "🎉 全てのセットアップが完了しました！"
echo ""
echo "👉 次のアクション:"
echo "1. backend/.env に Firebase / Stripe のキーを設定してください。"
echo "2. backend/storage/app/ に firebase_credentials.json を配置してください。"
echo "3. 実機テストを行う場合は、PCのIPアドレスを確認して api.ts と .env を更新してください。"
echo ""
echo "💻 開発サーバーの起動:"
echo "   Backend:  cd backend && ./vendor/bin/sail up -d"
echo "   Frontend: cd frontend/app && npx react-native start"
echo ""