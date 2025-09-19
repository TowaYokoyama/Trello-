import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# この行を修正して、プロジェクトのルートディレクトリをPythonのパスに追加します。
# これにより、`backend.app.models` のようにインポートできるようになります。
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

# ここでmodelsをインポートします。
from backend.app.models import Base

# Alembic Configオブジェクトを取得します。
config = context.config

# ロギングを設定します。
fileConfig(config.config_file_name)

# target_metadataをmodels.Baseに設定します。
target_metadata = Base.metadata

# その他の値は、config.get_main_option()から取得できます。
# 例: my_important_option = config.get_main_option("my_important_option")
# ...など。

def run_migrations_offline():
    """
    オフラインモードでマイグレーションを実行します。

    このモードでは、データベースへの接続は行われません。
    代わりに、スクリプトはSQLをファイルに出力します。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """
    オンラインモードでマイグレーションを実行します。

    このモードでは、Engineオブジェクトを作成し、
    データベースに接続してマイグレーションを実行します。
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
