# backend/app/crud.py

from sqlalchemy.orm import Session
from typing import Any, Dict, Union

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


# --- Task CRUD ---

def get_task(db: Session, task_id: int):
    """
    指定されたIDを持つタスクを1件取得します。
    """
    return db.query(models.Task).filter(models.Task.id == task_id).first()


def get_tasks_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    """
    特定のユーザーが所有するタスクをデータベースから取得します（ページネーション対応）。
    """
    return (
        db.query(models.Task)
        .filter(models.Task.owner_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_user_task(db: Session, task: schemas.TaskCreate, user_id: int):
    """
    特定のユーザーのために新しいタスクをデータベースに作成します。
    """
    db_task = models.Task(**task.dict(), owner_id=user_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, *, db_task: models.Task, task_in: Union[schemas.TaskUpdate, Dict[str, Any]]) -> models.Task:
    """
    データベース内のタスクを更新します。
    """
    if isinstance(task_in, dict):
        update_data = task_in
    else:
        update_data = task_in.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_task, field, value)

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, *, db_task: models.Task) -> models.Task:
    """
    データベースからタスクを削除します。
    """
    db.delete(db_task)
    db.commit()
    return db_task
