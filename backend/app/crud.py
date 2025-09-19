# backend/app/crud.py

from sqlalchemy.orm import Session
from typing import Any, Dict, Union, List

# 関連するモデルとスキーマ、認証関連の関数をインポートします。
from . import models, schemas, auth

# --- User CRUD ---

def get_user_by_email(db: Session, email: str):
    """
    指定されたメールアドレスを持つユーザーをデータベースから取得します。
    """
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate):
    """
    新しいユーザーをデータベースに作成します。
    """
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# --- Board CRUD ---

def get_board(db: Session, board_id: int):
    """
    指定されたIDを持つボードを1件取得します。
    """
    return db.query(models.Board).filter(models.Board.id == board_id).first()


def get_boards_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Board]:
    """
    特定のユーザーが所有するボードをデータベースから取得します（ページネーション対応）。
    """
    return (
        db.query(models.Board)
        .filter(models.Board.owner_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_user_board(db: Session, board: schemas.BoardCreate, user_id: int) -> models.Board:
    """
    特定のユーザーのために新しいボードをデータベースに作成します。
    """
    db_board = models.Board(**board.dict(), owner_id=user_id)
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board


def update_board(db: Session, *, db_board: models.Board, board_in: Union[schemas.BoardUpdate, Dict[str, Any]]) -> models.Board:
    """
    データベース内のボードを更新します。
    """
    if isinstance(board_in, dict):
        update_data = board_in
    else:
        update_data = board_in.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_board, field, value)

    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board


def delete_board(db: Session, *, db_board: models.Board) -> models.Board:
    """
    データベースからボードを削除します。
    """
    db.delete(db_board)
    db.commit()
    return db_board


# --- List CRUD ---

def get_list(db: Session, list_id: int):
    """
    指定されたIDを持つリストを1件取得します。
    """
    return db.query(models.List).filter(models.List.id == list_id).first()


def get_lists_by_board(db: Session, board_id: int, skip: int = 0, limit: int = 100) -> List[models.List]:
    """
    特定のボードに属するリストをデータベースから取得します（ページネーション対応）。
    """
    return (
        db.query(models.List)
        .filter(models.List.board_id == board_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_board_list(db: Session, list_item: schemas.ListCreate, board_id: int) -> models.List:
    """
    特定のボードのために新しいリストをデータベースに作成します。
    """
    db_list = models.List(**list_item.dict(), board_id=board_id)
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list


def update_list(db: Session, *, db_list: models.List, list_in: Union[schemas.ListUpdate, Dict[str, Any]]) -> models.List:
    """
    データベース内のリストを更新します。
    """
    if isinstance(list_in, dict):
        update_data = list_in
    else:
        update_data = list_in.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_list, field, value)

    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list


def delete_list(db: Session, *, db_list: models.List) -> models.List:
    """
    データベースからリストを削除します。
    """
    db.delete(db_list)
    db.commit()
    return db_list


# --- Card CRUD ---

def get_card(db: Session, card_id: int):
    """
    指定されたIDを持つカードを1件取得します。
    """
    return db.query(models.Card).filter(models.Card.id == card_id).first()


def get_cards_by_list(db: Session, list_id: int, skip: int = 0, limit: int = 100) -> List[models.Card]:
    """
    特定のリストに属するカードをデータベースから取得します（ページネーション対応）。
    """
    return (
        db.query(models.Card)
        .filter(models.Card.list_id == list_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_list_card(db: Session, card: schemas.CardCreate, list_id: int) -> models.Card:
    """
    特定のリストのために新しいカードをデータベースに作成します。
    """
    db_card = models.Card(**card.dict(), list_id=list_id)
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


def update_card(db: Session, *, db_card: models.Card, card_in: Union[schemas.CardUpdate, Dict[str, Any]]) -> models.Card:
    """
    データベース内のカードを更新します。
    """
    if isinstance(card_in, dict):
        update_data = card_in
    else:
        update_data = card_in.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_card, field, value)

    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


def delete_card(db: Session, *, db_card: models.Card) -> models.Card:
    """
    データベースからカードを削除します。
    """
    db.delete(db_card)
    db.commit()
    return db_card
