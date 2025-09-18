# backend/app/models.py

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

# database.pyで作成したBaseクラスをインポートします。
from .database import Base


class User(Base):
    """
    データベースの'users'テーブルを表すモデルクラス。
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # --- ここから追加 --- #
    # UserとTaskの関連付けを定義します。
    # "Task"はこのUserモデルが関連するモデルクラス名を指定します。
    # back_populates="owner"は、Taskモデル側の'owner'という属性と相互に関連付けることを示します。
    # これにより、user.tasks という形で、そのユーザーが持つタスクのリストにアクセスできます。
    tasks = relationship("Task", back_populates="owner")#Taskモデルとセットで結びつく
    # --- ここまで追加 --- #


# --- ここから追加 --- #
class Task(Base):
    """
    データベースの'tasks'テーブルを表すモデルクラス。
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True, nullable=True) # nullable=Trueは、このカラムが空でも良いことを示します
    completed = Column(Boolean, default=False) # default=Falseは、作成時に指定がなければ自動的にFalseが入ることを示します

    # --- 外部キー(ForeignKey)の定義 --- #
    # owner_idカラムを、usersテーブルのidカラムへの外部キーとして設定します。
    # これにより、「tasksテーブルのowner_idは、必ずusersテーブルに存在するidである」という制約が生まれます。
    owner_id = Column(Integer, ForeignKey("users.id"))

    # --- 逆方向の関連付け --- #
    # TaskとUserの関連付けを定義します。
    # back_populates="tasks"は、Userモデル側の'tasks'という属性と相互に関連付けることを示します。
    # これにより、task.owner という形で、そのタスクを所有するユーザーオブジェクトにアクセスできます。
    owner = relationship("User", back_populates="tasks")
# --- ここまで追加 --- #
