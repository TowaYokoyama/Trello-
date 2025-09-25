# backend/app/schemas.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Card Schemas --- (旧 Task Schemas)
# 下でListスキーマを定義するため、先にCard関連を定義します。

class CardBase(BaseModel):
    """
    カード情報の基本となるスキーマ。
    """
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


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
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class Card(CardBase):
    """
    APIがレスポンスとして返すカード情報のためのスキーマ。
    """
    id: int
    completed: bool
    list_id: int  # どのリストに属するかを示すID
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

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

class ListUpdate(BaseModel):
    """
    リスト更新時にAPIが受け取るデータのスキーマ
    """
    title:Optional[str] = None 
    board_id: Optional[int] = None

class ListSchema(ListBase):
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
    title: str
    description: Optional[str] = None
    color: Optional[str] = None

class BoardCreate(BoardBase):
    pass

class BoardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class BoardForUser(BoardBase):
    id: int
    owner_id: int
    color: Optional[str] = None
    class Config:
        from_attributes = True

# --- User Schemas ---

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserForBoard(UserBase):
    id: int
    class Config:
        from_attributes = True

# --- Main Schemas with relationships ---

class Board(BoardBase):
    id: int
    owner_id: int
    color: Optional[str] = None
    lists: List["ListSchema"] = []
    members: List[UserForBoard] = []

    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    boards: List[BoardForUser] = []
    push_tokens: List['PushToken'] = []

    class Config:
        from_attributes = True


# --- PushToken Schemas ---

class PushTokenBase(BaseModel):
    token: str

class PushTokenCreate(PushTokenBase):
    pass

class PushToken(PushTokenBase):
    id: int
    user_id: int

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
