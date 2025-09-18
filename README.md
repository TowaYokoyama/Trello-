# Trello Clone

## 概要

ユーザーがシームレスにタスクを管理し、生産性を最大化するためのモバイルアプリケーション。
React NativeとPython(FastAPI)を使用して構築されています。

## 技術スタック

- **フロントエンド**: React Native
- **バックエンド**: Python (FastAPI)
- **データベース**: PostgreSQL
- **キャッシュ/タスクキュー**: Redis
- **コンテナ化**: Docker, Docker Compose

## 開発環境構築

### 前提条件

- Git
- Docker
- Docker Compose
- Node.js (npmまたはyarn)
- Expo Go アプリ (スマートフォンでのテスト用)

### インストールと起動

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd Trello
   ```

2. **バックエンドの起動**

   バックエンドサービス（API, データベース, Redis）はDocker Composeを使用して管理します。

   ```bash
   # コンテナをバックグラウンドで起動
   docker-compose up -d --build
   ```
   APIサーバーは `http://localhost:8000` で利用可能になります。

3. **フロントエンドの起動**

   `frontend` ディレクトリはExpoでセットアップされています。

   ```bash
   # frontendディレクトリに移動
   cd frontend

   # 依存関係をインストール
   npm install
   # または
   yarn install
   ```

   以下のコマンドで各プラットフォーム向けにアプリケーションを起動します。

   ```bash
   # Androidエミュレータまたは実機で起動
   npm run android

   # iOSシミュレータまたは実機で起動 (macOSが必要)
   npm run ios

   # Webブラウザで起動
   npm run web
   ```

## ディレクトリ構成

```
.
├── backend/          # バックエンド (FastAPI)
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── frontend/         # フロントエンド (Expo)
│   ├── app.json
│   ├── package.json
│   └── ...
├── docker-compose.yml  # Docker Compose設定ファイル
└── README.md         # このファイル
```
# Trello-
