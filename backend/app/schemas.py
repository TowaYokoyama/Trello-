# backend/app/schemas.py

from pydantic import BaseModel
from typing import List, Optional

# --- Card Schemas --- (旧 Task Schemas)
# 下でListスキーマを定義するため、先にCard関連を定義します。

class CardBase(BaseModel):
    """
    カード情報の基本となるスキーマ。
    """
    title: str
    description: Optional[str] = None


class CardCreate(CardBase):
    """
    カード作成時にAPIが受け取るデータのためのスキーマ。
    CardBaseを継承しているため、titleとdescriptionフィールドを持ちます。
    """
    pass  # 追加のフィールドがない場合はpassと書きます


class CardUpdate(BaseModel):
    """
    カード更新時にAPIが受け取るデータのためのスキーマ。
    全てのフィールドをOptionalにすることで、一部のフィールドのみの更新を可能にします。
    """
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None


class Card(CardBase):
    """
    APIがレスポンスとして返すカード情報のためのスキーマ。
    """
    id: int
    completed: bool
    list_id: int  # どのリストに属するかを示すID

    class Config:
        # ORMモデルからPydanticモデルへの変換を可能にします。
        from_attributes = True


# --- List Schemas ---

class ListBase(BaseModel):
    """
    リスト情報の基本となるスキーマ。
    """
    title: str


class ListCreate(ListBase):
    """
    リスト作成時にAPIが受け取るデータのためのスキーマ。
    """
    pass


class List(ListBase):
    """
    APIがレスポンスとして返すリスト情報のためのスキーマ。
    """
    id: int
    board_id: int  # どのボードに属するかを示すID
    cards: List[Card] = []  # このリストが持つカードのリスト

    class Config:
        from_attributes = True


# --- Board Schemas ---

class BoardBase(BaseModel):
    """
    ボード情報の基本となるスキーマ。
    """
    title: str
    description: Optional[str] = None


class BoardCreate(BoardBase):
    """
    ボード作成時にAPIが受け取るデータのためのスキーマ。
    """
    pass


class Board(BoardBase):
    """
    APIがレスポンスとして返すボード情報のためのスキーマ。
    """
    id: int
    owner_id: int  # どのユーザーに属するかを示すID
    lists: List[List] = []  # このボードが持つリストのリスト

    class Config:
        from_attributes = True


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
    # このユーザーが所有するボードのリスト。
    # レスポンスモデルとしてUserスキーマを指定すると、FastAPIは自動的に
    # user.boards (models.pyで定義したrelationship) からデータを取得し、
    # この'boards'フィールドにBoardスキーマのリストとして設定してくれます。
    boards: List[Board] = []

    class Config:
        from_attributes = True


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
