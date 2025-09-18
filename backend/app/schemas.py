# backend/app/schemas.py

from pydantic import BaseModel
from typing import List, Optional

# --- Task Schemas ---
# 下でUserスキーマを定義するため、先にTask関連を定義します。

class TaskBase(BaseModel):
    """
    タスク情報の基本となるスキーマ。
    """
    title: str
    description: Optional[str] = None


class TaskCreate(TaskBase):
    """
    タスク作成時にAPIが受け取るデータのためのスキーマ。
    TaskBaseを継承しているため、titleとdescriptionフィールドを持ちます。
    """
    pass # 追加のフィールドがない場合はpassと書きます


class TaskUpdate(BaseModel):
    """
    タスク更新時にAPIが受け取るデータのためのスキーマ。
    全てのフィールドをOptionalにすることで、一部のフィールドのみの更新を可能にします。
    (例: タイトルだけ変更する、完了状態だけ変更する、など)
    """
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None


class Task(TaskBase):
    """
    APIがレスポンスとして返すタスク情報のためのスキーマ。
    """
    id: int
    completed: bool
    owner_id: int # どのユーザーに属するかを示すID

    class Config:
        # orm_mode = True を設定すると、このPydanticモデルが
        # SQLAlchemyモデル（ORMオブジェクト）から自動的にデータを読み取れるようになります。
        # 例: task_model.title のように、DBモデルの属性から値を取得してスキーマを構成します。
        orm_mode = True


# --- User Schemas ---

class UserBase(BaseModel):
    """
    ユーザー情報の基本的なスキーマ。
    """
    email: str


class UserCreate(UserBase):
    """
    ユーザー作成時にAPIリクエストのボディとして受け取るデータのためのスキーマ。
    """
    password: str


class User(UserBase):
    """
    APIレスポンスとして返すユーザー情報のためのスキーマ。
    """
    id: int
    # --- ここから追加 --- #
    # このユーザーが所有するタスクのリスト。
    # レスポンスモデルとしてUserスキーマを指定すると、FastAPIは自動的に
    # user.tasks (models.pyで定義したrelationship) からデータを取得し、
    # この'tasks'フィールドにTaskスキーマのリストとして設定してくれます。
    tasks: List[Task] = []
    # --- ここまで追加 --- #

    class Config:
        orm_mode = True


# --- Token Schemas ---

class Token(BaseModel):
    """
    クライアントに返すJWTアクセストークンのためのスキーマ。
    """
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """
    JWTトークンの中に埋め込むデータのためのスキーマ。
    """
    email: Optional[str] = None
