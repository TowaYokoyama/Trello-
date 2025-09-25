# backend/app/models.py

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Table
from sqlalchemy.orm import relationship

# database.pyで作成したBaseクラスをインポートします。
from .database import Base

# ボードとユーザーの多対多関係を定義する中間テーブル
board_members = Table(
    "board_members",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("board_id", Integer, ForeignKey("boards.id"), primary_key=True),
)


class User(Base):
    """
    データベースの'users'テーブルを表すモデルクラス。
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    boards = relationship("Board", back_populates="owner")
    member_boards = relationship("Board", secondary=board_members, back_populates="members")
    push_tokens = relationship("PushToken", back_populates="user")


class Board(Base):
    """
    データベースの'boards'テーブルを表すモデルクラス。
    """
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True, nullable=True)
    color = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="boards")
    members = relationship("User", secondary=board_members, back_populates="member_boards")

    lists = relationship("List", back_populates="board")


class List(Base):
    """
    データベースの'lists'テーブルを表すモデルクラス。
    """
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)

    board_id = Column(Integer, ForeignKey("boards.id"))
    board = relationship("Board", back_populates="lists")

    cards = relationship("Card", back_populates="list")


class Card(Base):
    """
    データベースの'cards'テーブルを表すモデルクラス。
    """
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True, nullable=True)
    completed = Column(Boolean, default=False)
    start_date = Column(DateTime, nullable=True, index=True)
    due_date = Column(DateTime, nullable=True, index=True)

    list_id = Column(Integer, ForeignKey("lists.id"))
    list = relationship("List", back_populates="cards")


class PushToken(Base):
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)

    user = relationship("User", back_populates="push_tokens")

