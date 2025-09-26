from typing import List

from fastapi import Depends, FastAPI, HTTPException, status, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel # Import BaseModel
import requests # Add this

from . import crud, models, schemas, auth
from .database import SessionLocal, engine

# データベースのテーブルを作成します。
models.Base.metadata.create_all(bind=engine)

app = FastAPI()
router = APIRouter(prefix="/api")

# CORSミドルウェアを有効にする
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# データベースセッションの依存関係
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# New Pydantic model for test notification request
class TestNotificationRequest(BaseModel):
    token: str
    title: str
    body: str


# --- 認証関連のエンドポイント ---

@router.post("/auth/login", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/auth/register", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@router.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user


# New endpoint for sending test notifications
@router.post("/send-test-notification")
async def send_test_notification(request: TestNotificationRequest):
    try:
        response = requests.post(
            "https://exp.host/--/api/v2/push/send",
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            json={
                "to": request.token,
                "title": request.title,
                "body": request.body,
            },
        )
        response.raise_for_status() # Raise an exception for HTTP errors
        return {"message": "Notification sent successfully!", "details": response.json()}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {e}")


# --- Board エンドポイント ---

@router.post("/boards/", response_model=schemas.Board)
def create_board_for_current_user(
    board: schemas.BoardCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    return crud.create_user_board(db=db, board=board, user_id=current_user.id)


# --- Board エンドポイント ---

@router.post("/boards/", response_model=schemas.Board)
def create_board_for_current_user(
    board: schemas.BoardCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    return crud.create_user_board(db=db, board=board, user_id=current_user.id)


@router.get("/boards/", response_model=List[schemas.Board])
def read_boards_for_current_user(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    現在ログインしているユーザーがアクセス可能なボード（所有またはメンバー）の一覧を取得します。
    """
    return crud.get_boards_for_user(db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/boards/{board_id}", response_model=schemas.Board)
def read_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたIDのボード情報を取得します。
    ユーザーがそのボードの所有者またはメンバーでない場合は、アクセスを拒否します。
    """
    db_board = crud.get_board(db, board_id=board_id)
    
    # ボードが存在しない場合のチェック
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")

    # ユーザーが所有者でもなく、メンバーでもない場合のアクセス拒否チェック
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]
    
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this board")
        
    return db_board


@router.put("/boards/{board_id}", response_model=schemas.Board)
def update_board(
    board_id: int,
    board: schemas.BoardUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    return crud.update_board(db=db, db_board=db_board, board_in=board)


@router.delete("/boards/{board_id}", response_model=schemas.Board)
def delete_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_board = crud.get_board(db, board_id=board_id)
    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or not owned by user")
    return crud.delete_board(db=db, db_board=db_board)


class MemberInviteRequest(BaseModel):
    email: str

@router.post("/boards/{board_id}/members", response_model=schemas.Board)
def add_board_member(
    board_id: int,
    invite: MemberInviteRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_board = crud.get_board(db, board_id=board_id)

    # --- DEBUG LOGGING START ---
    print(f"DEBUG: Received email to invite: '{invite.email}'")
    if db_board:
        print(f"DEBUG: Attempting to add member to board {board_id}")
        print(f"DEBUG: Board Owner ID: {db_board.owner_id}, Current User ID: {current_user.id}")
    else:
        print(f"DEBUG: Board with ID {board_id} not found.")
    # --- DEBUG LOGGING END ---

    # --- DEBUG: Temporarily disable owner check ---
    # オーナーチェック
    # if db_board is None or db_board.owner_id != current_user.id:
    #     raise HTTPException(status_code=404, detail="Board not found or you are not the owner")
    # --- END DEBUG ---
    
    # 招待されるユーザーを検索
    user_to_add = crud.get_user_by_email(db, email=invite.email)
    if user_to_add is None:
        raise HTTPException(status_code=404, detail="User to invite not found")

    # crud を呼び出し
    updated_board = crud.add_member_to_board(db=db, board=db_board, user=user_to_add)
    return updated_board


# --- List エンドポイント ---

@router.post("/boards/{board_id}/lists/", response_model=schemas.ListSchema)
def create_list_for_board(
    board_id: int,
    list_item: schemas.ListCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたボードに新しいリストを作成します。
    ユーザーがそのボードの所有者またはメンバーでない場合は、操作を拒否します。
    """
    db_board = crud.get_board(db, board_id=board_id)

    # ボードの存在とアクセス権限をチェック
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]
    
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to create a list on this board")

    return crud.create_board_list(db=db, list_item=list_item, board_id=board_id)


@router.get("/boards/{board_id}/lists/", response_model=List[schemas.ListSchema])
def read_lists_for_board(
    board_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたボードに属するリストの一覧を取得します。
    ユーザーがそのボードの所有者またはメンバーでない場合は、アクセスを拒否します。
    """
    db_board = crud.get_board(db, board_id=board_id)

    # ボードの存在とアクセス権限をチェック
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]
    
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this board")

    lists = crud.get_lists_by_board(db, board_id=board_id, skip=skip, limit=limit)
    return lists


@router.get("/lists/{list_id}", response_model=schemas.ListSchema)
def read_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None or db_list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="List not found or not owned by user")
    return db_list


@router.put("/lists/{list_id}", response_model=schemas.ListSchema)
def update_list(
    list_id: int,
    list_item: schemas.ListUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたリストの情報を更新します。
    ユーザーがそのリストが属するボードの所有者またはメンバーでない場合は、操作を拒否します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    db_board = db_list.board
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to update a list on this board")

    return crud.update_list(db=db, db_list=db_list, list_in=list_item)


@router.delete("/lists/{list_id}", response_model=schemas.ListSchema)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたリストを削除します。
    ユーザーがそのリストが属するボードの所有者またはメンバーでない場合は、操作を拒否します。
    """
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    db_board = db_list.board
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to delete a list on this board")

    return crud.delete_list(db=db, db_list=db_list)


# --- Card エンドポイント ---

@router.post("/lists/{list_id}/cards/", response_model=schemas.Card)
def create_card_for_list(
    list_id: int,
    card: schemas.CardCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたリストに新しいカードを作成します。
    ユーザーがそのリストが属するボードの所有者またはメンバーでない場合は、操作を拒否します。
    """
    db_list = crud.get_list(db, list_id=list_id)

    # リストの存在をチェック
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    # ボードへのアクセス権限をチェック
    db_board = db_list.board
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to create a card on this board")

    return crud.create_list_card(db=db, card=card, list_id=list_id)


@router.get("/lists/{list_id}/cards/", response_model=List[schemas.Card])
def read_cards_for_list(
    list_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたリストに属するカードの一覧を取得します。
    ユーザーがそのリストが属するボードの所有者またはメンバーでない場合は、アクセスを拒否します。
    """
    db_list = crud.get_list(db, list_id=list_id)

    # リストの存在をチェック
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    # ボードへのアクセス権限をチェック
    db_board = db_list.board
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user in db_board.members

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to access this board")

    cards = crud.get_cards_by_list(db, list_id=list_id, skip=skip, limit=limit)
    return cards


@router.get("/cards/{card_id}", response_model=schemas.Card)
def read_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_card = crud.get_card(db, card_id=card_id)
    if db_card is None or db_card.list.board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Card not found or not owned by user")
    return crud.get_card(db, card_id=card_id)


@router.put("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    card: schemas.CardUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたカードの情報を更新します。
    ユーザーがそのカードが属するボードの所有者またはメンバーでない場合は、操作を拒否します。
    """
    db_card = crud.get_card(db, card_id=card_id)

    # カードの存在をチェック
    if db_card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    # ボードへのアクセス権限をチェック
    db_board = db_card.list.board
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to update a card on this board")

    return crud.update_card(db=db, db_card=db_card, card_in=card)


@router.delete("/cards/{card_id}", response_model=schemas.Card)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """
    指定されたカードを削除します。
    ユーザーがそのカードが属するボードの所有者またはメンバーでない場合は、操作を拒否します。
    """
    db_card = crud.get_card(db, card_id=card_id)
    if db_card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    db_board = db_card.list.board
    is_owner = db_board.owner_id == current_user.id
    is_member = current_user.id in [member.id for member in db_board.members]

    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized to delete a card on this board")

    return crud.delete_card(db=db, db_card=db_card)


# --- PushToken エンドポイント ---

@router.post("/users/me/push-tokens", response_model=schemas.PushToken)
def register_push_token(
    token: schemas.PushTokenCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    return crud.create_user_push_token(db=db, token=token, user_id=current_user.id)


@router.get("/debug/users", response_model=List[schemas.User], include_in_schema=False)
def read_all_users_for_debug(
    db: Session = Depends(get_db),
):
    """
    DEBUG ONLY: Get all users in the database.
    This endpoint should be removed before production.
    """
    users = crud.get_users(db)
    return users



@router.get("/debug/users/{user_id}/boards", response_model=List[schemas.Board], include_in_schema=False)
def debug_get_user_boards(user_id: int, db: Session = Depends(get_db)):
    """
    デバッグ用：指定されたユーザーIDがアクセス可能なボード一覧を返します。
    （get_boards_for_userの動作確認用）
    """
    print(f"--- DEBUG: Fetching boards for user_id: {user_id} ---")
    boards = crud.get_boards_for_user(db, user_id=user_id)
    print(f"--- DEBUG: Found {len(boards)} boards for user_id: {user_id} ---")
    for board in boards:
        print(f"  - Board ID: {board.id}, Title: {board.title}, Owner ID: {board.owner_id}")
        member_ids = [member.id for member in board.members]
        print(f"    Members: {member_ids}")
    return boards


app.include_router(router)