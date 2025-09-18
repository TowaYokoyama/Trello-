# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List

# これまでに作成したモジュールをインポートします。
from . import auth, crud, models, schemas
from .database import engine

# --- データベースの初期化 ---
# アプリケーション起動時に、modelsで定義されたテーブルをDBに作成します。
models.Base.metadata.create_all(bind=engine)

# FastAPIアプリケーションのインスタンスを作成します。
app = FastAPI()


# --- APIエンドポイント ---

# --- 認証関連 --- #
@app.post("/api/auth/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(auth.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@app.post("/api/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# --- タスク関連 --- #

@app.post("/api/tasks/", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate, 
    db: Session = Depends(auth.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    新しいタスクを作成します。
    """
    return crud.create_user_task(db=db, task=task, user_id=current_user.id)


@app.get("/api/tasks/", response_model=List[schemas.Task])
def read_tasks(
    db: Session = Depends(auth.get_db),
    skip: int = 0, 
    limit: int = 100, 
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    現在のログインユーザーが所有するタスクの一覧を取得します。
    """
    tasks = crud.get_tasks_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return tasks


@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task_endpoint(
    task_id: int,
    task_in: schemas.TaskUpdate,
    db: Session = Depends(auth.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    指定されたIDのタスクを更新します。
    """
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task or db_task.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = crud.update_task(db=db, db_task=db_task, task_in=task_in)
    return updated_task


@app.delete("/api/tasks/{task_id}", response_model=schemas.Task)
def delete_task_endpoint(
    task_id: int,
    db: Session = Depends(auth.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    指定されたIDのタスクを削除します。
    """
    db_task = crud.get_task(db=db, task_id=task_id)
    if not db_task or db_task.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    deleted_task = crud.delete_task(db=db, db_task=db_task)
    return deleted_task


# --- 動作確認用のルートエンドポイント --- #

@app.get("/")
def read_root():
    return {"message": "Welcome to the Trello Clone API"}
