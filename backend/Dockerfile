FROM python:3.9-slim

# コンテナ内の作業ディレクトリを設定します
WORKDIR /app

# 依存関係をインストールします
# requirements.txtを先にコピーしてインストールすることで、コード変更のたびにライブラリが再インストールされるのを防ぎます
COPY ./requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# bcryptのバージョン問題を解決するために、安定したバージョンを明示的にインストールします
RUN pip install bcrypt==3.2.0

# アプリケーションコードを作業ディレクトリにコピーします
# これにより、'app'ディレクトリなどがコンテナ内に配置されます
COPY . .

# アプリケーションを起動します
# CMD ["uvicorn", "<パッケージ名>.<モジュール名>:<FastAPIインスタンス名>", ...]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
