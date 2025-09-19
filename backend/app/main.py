from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import crud, models, schemas, auth
from .database import SessionLocal, engine

# データベースのテーブルを作成します。
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORSミドルウェアを有効にする
origins = [
    "http://localhost:8081",  # Next.jsアプリケーションのオリジン
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベースセッションの依存関係
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- 認証関連のエンドポイント ---

@app.post("/api/auth/login", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    ユーザー名とパスワードで認証し、アクセストークンを返します。
    """
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/register", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    新しいユーザーを登録します。
    """
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@app.get("/api/users/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    """
    現在認証されているユーザーの情報を取得します。
    """
    return current_user


# --- Board エンドポイント ---

@app.post("/users/me/boards/", response_model=schemas.Board)
def create_board_for_current_user(
    board: schemas.BoardCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    現在認証されているユーザーのために新しいボードを作成します。
    """
    return crud.create_user_board(db=db, board=board, user_id=current_user.id)


@app.get("/users/me/boards/", response_model=List[schemas.Board])
def read_boards_for_current_user(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    現在認証されているユーザーが所有するすべてのボードを取得します。
    """
    boards = crud.get_boards_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return boards


@app.get("/boards/{board_id}", response_model=schemas.Board)
def read_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのボードを取得します。ユーザーがボードの所有者であることを確認します。
    """
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    return db_board


@app.put("/boards/{board_id}", response_model=schemas.Board)
def update_board(
    board_id: int,
    board: schemas.BoardUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのボードを更新します。ユーザーがボードの所有者であることを確認します。
    """
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    return crud.update_board(db=db, db_board=db_board, board_in=board)


@app.delete("/boards/{board_id}", response_model=schemas.Board)
def delete_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのボードを削除します。ユーザーがボードの所有者であることを確認します。
    """
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    return crud.delete_board(db=db, db_board=db_board)


# --- List エンドポイント ---

@app.post("/boards/{board_id}/lists/", response_model=schemas.ListSchema)
def create_list_for_board(
    board_id: int,
    list_item: schemas.ListCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたボード内に新しいリストを作成します。ユーザーがボードの所有者であることを確認します。
    """
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    return crud.create_board_list(db=db, list_item=list_item, board_id=board_id)


@app.get("/boards/{board_id}/lists/", response_model=List[schemas.ListSchema])
def read_lists_for_board(
    board_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたボードに属するすべてのリストを取得します。ユーザーがボードの所有者であることを確認します。
    """
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    lists = crud.get_lists_by_board(db, board_id=board_id, skip=skip, limit=limit)
    return lists


@app.get("/lists/{list_id}", response_model=schemas.ListSchema)
def read_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのリストを取得します。ユーザーがリストの属するボードの所有者であることを確認します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None or db_list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="List not found or not owned by user")
    return db_list


@app.put("/lists/{list_id}", response_model=schemas.ListSchema)
def update_list(
    list_id: int,
    list_item: schemas.ListUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのリストを更新します。ユーザーがリストの属するボードの所有者であることを確認します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None or db_list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="List not found or not owned by user")
    return crud.update_list(db=db, db_list=db_list, list_in=list_item)


@app.delete("/lists/{list_id}", response_model=schemas.ListSchema)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのリストを削除します。ユーザーがリストの属するボードの所有者であることを確認します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None or db_list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="List not found or not owned by user")
    return crud.delete_list(db=db, db_list=db_list)


# --- Card エンドポイント ---

@app.post("/lists/{list_id}/cards/", response_model=schemas.Card)
def create_card_for_list(
    list_id: int,
    card: schemas.CardCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたリスト内に新しいカードを作成します。ユーザーがリストの属するボードの所有者であることを確認します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None or db_list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="List not found or not owned by user")
    return crud.create_list_card(db=db, card=card, list_id=list_id)


@app.get("/lists/{list_id}/cards/", response_model=List[schemas.Card])
def read_cards_for_list(
    list_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたリストに属するすべてのカードを取得します。ユーザーがリストの属するボードの所有者であることを確認します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None or db_list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="List not found or not owned by user")
    cards = crud.get_cards_by_list(db, list_id=list_id, skip=skip, limit=limit)
    return cards


@app.get("/cards/{card_id}", response_model=schemas.Card)
def read_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのカードを取得します。ユーザーがカードの属するリストのボードの所有者であることを確認します。
    """
    db_card = crud.get_card(db, card_id=card_id)
    if db_card is None or db_card.list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Card not found or not owned by user")
    return crud.get_card(db, card_id=card_id)


@app.put("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    card: schemas.CardUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのカードを更新します。ユーザーがカードの属するリストのボードの所有者であることを確認します。
    """
    db_card = crud.get_card(db, card_id=card_id)
    if db_card is None or db_card.list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Card not found or not owned by user")
    return crud.update_card(db=db, db_card=db_card, card_in=card)


@app.delete("/cards/{card_id}", response_model=schemas.Card)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのカードを削除します。ユーザーがカードの属するリストのボードの所有者であることを確認します。
    """
    db_card = crud.get_card(db, card_id=card_id)
    if db_card is None or db_card.list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Card not found or not owned by user")
    return crud.delete_card(db=db, db_card=db_card)
