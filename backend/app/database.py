# backend/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# docker-compose.ymlで設定した環境変数からデータベースのURLを取得します。
# このURLは、どのデータベースに、どのユーザー名とパスワードで接続するかを指定します。
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5433/mydatabase?client_encoding=UTF8")

# SQLAlchemyの「エンジン」を作成します。
# これがデータベースへの中心的な接続ポイントとなります。
engine = create_engine(DATABASE_URL)

# データベースセッションを作成するためのクラスを定義します。
# autocommit=False: データを変更する際は、明示的にcommit(保存)を呼ぶ必要があります。
# autoflush=False: セッションが自動的にDBに変更を反映しないようにします。
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# データベースモデル（テーブルの構造）を定義するためのベースクラスを作成します。
# これを継承して、モデルクラス（例: Userモデル）を作成します。
Base = declarative_base()
