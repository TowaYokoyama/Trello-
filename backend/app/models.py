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

    boards = relationship("Board", back_populates="owner")


class Board(Base):
    """
    データベースの'boards'テーブルを表すモデルクラス。
    """
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="boards")

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

    list_id = Column(Integer, ForeignKey("lists.id"))
    list = relationship("List", back_populates="cards")

