import asyncio
from typing import List, Dict, Any, Union

from fastapi import Depends, FastAPI, HTTPException, status, APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel 
import requests 

# モジュールインポート (環境に合わせて調整)
from . import crud, models, schemas, auth
from .database import SessionLocal, engine 

# データベースのテーブルを作成します。
# models.Base.metadata.create_all(bind=engine) # Docker環境で既に実行されているはず

# --- WebSocket関連の実装 --- 

class ConnectionManager:
    """
    WebSocket接続を管理するクラス。 誰が今オンライン化を覚えて、メッセージを配信する役割
    """
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, board_id: int):
        """ 新しいWebSocket接続を受け入れ、管理下に追加します。 """
        if board_id not in self.active_connections:
            self.active_connections[board_id] = []
        self.active_connections[board_id].append(websocket)

    def disconnect(self, websocket: WebSocket, board_id: int):
        """ 切断されたWebSocket接続を管理下から削除します。 """
        if board_id in self.active_connections:
            self.active_connections[board_id].remove(websocket)
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

    async def broadcast(self, message: dict, board_id: int):
        """ 指定されたボードIDに接続しているすべてのクライアントにJSONメッセージを送信（ブロードキャスト）します。 """
        if board_id in self.active_connections:
            send_tasks = []
            valid_connections = self.active_connections[board_id].copy() # 削除用リストをコピーして参照を保持
            
            for connection in valid_connections:
                send_tasks.append(connection.send_json(message))
                
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            
            connections_to_remove = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    connections_to_remove.append(valid_connections[i])
                    
            for connection in connections_to_remove:
                # 【修正】タイプミスのない正しい辞書を参照
                if board_id in self.active_connections and connection in self.active_connections[board_id]:
                    self.active_connections[board_id].remove(connection)
                    
            if board_id in self.active_connections and not self.active_connections[board_id]:
                del self.active_connections[board_id]

# ConnectionManagerのインスタンスを作成
manager = ConnectionManager()

# --- WebSocket関連の実装ここまで ---

app = FastAPI()
router = APIRouter(prefix="/api")

# CORSミドルウェアを有効にする
# 【修正】フロントエンドのオリジンを追加
origins = ["*", "http://localhost:8081", ]

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


# --- 認証関連のエンドポイント (変更なし) ---

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


# New endpoint for sending test notifications (変更なし)
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
        response.raise_for_status() 
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

# 【重複エンドポイントを削除】

@router.get("/boards/", response_model=List[schemas.Board])
def read_boards_for_current_user(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """ 現在ログインしているユーザーがアクセス可能なボード（所有またはメンバー）の一覧を取得します。 """
    return crud.get_boards_for_user(db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/boards/{board_id}", response_model=schemas.Board)
def read_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    """ 指定されたIDのボード情報を取得します。 """
    db_board = crud.get_board(db, board_id=board_id)
    
    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")

    # 【修正】認可チェックを crud.py のロジックに合わせる
    is_allowed = crud.is_user_allowed_access(db, board_id=board_id, user_id=current_user.id)
    
    if not is_allowed:
        # REST API なので HTTPException を投げる
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this board")
        
    return db_board


@router.put("/boards/{board_id}", response_model=schemas.Board)
def update_board(
    board_id: int,
    board: schemas.BoardUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    # 【認可チェック修正】
    is_allowed = crud.is_user_allowed_access(db, board_id=board_id, user_id=current_user.id)
    db_board = crud.get_board(db, board_id=board_id)
    
    if db_board is None or not is_allowed:
        raise HTTPException(status_code=404, detail="Board not found or not authorized")
        
    # オーナーのみがボード設定を更新できる場合、ここでさらにチェックが必要
    if db_board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can modify board settings.")
        
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

    if db_board is None or db_board.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Board not found or you are not the owner")
        
    user_to_add = crud.get_user_by_email(db, email=invite.email)
    if user_to_add is None:
        raise HTTPException(status_code=404, detail="User to invite not found")

    return crud.add_member_to_board(db=db, board=db_board, user=user_to_add)


# --- List エンドポイント ---

@router.post("/boards/{board_id}/lists/", response_model=schemas.ListSchema)
def create_list_for_board(
    board_id: int,
    list_item: schemas.ListCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_board = crud.get_board(db, board_id=board_id)

    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    
    is_allowed = crud.is_user_allowed_access(db, board_id=board_id, user_id=current_user.id)
    
    if not is_allowed:
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
    db_board = crud.get_board(db, board_id=board_id)

    if db_board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    
    # 【修正】is_user_member_of_board を統合関数に置き換え
    is_allowed = crud.is_user_allowed_access(db, board_id=board_id, user_id=current_user.id)
    
    if not is_allowed:
        # ★ REST API なので HTTPException を投げる
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this board")

    return crud.get_lists_by_board(db, board_id=board_id, skip=skip, limit=limit)


@router.put("/lists/{list_id}", response_model=schemas.ListSchema)
def update_list(
    list_id: int,
    list_item: schemas.ListUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    db_board = db_list.board
    is_allowed = crud.is_user_allowed_access(db, board_id=db_board.id, user_id=current_user.id)

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Not authorized to update a list on this board")

    return crud.update_list(db=db, db_list=db_list, list_in=list_item)


@router.delete("/lists/{list_id}", response_model=schemas.ListSchema)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")
        
    db_board = db_list.board
    is_allowed = crud.is_user_allowed_access(db, board_id=db_board.id, user_id=current_user.id)
    
    if not is_allowed:
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
    db_list = crud.get_list(db, list_id=list_id)

    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    db_board = db_list.board
    is_allowed = crud.is_user_allowed_access(db, board_id=db_board.id, user_id=current_user.id)

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Not authorized to create a card on this board")

    return crud.create_list_card(db=db, card=card, list_id=list_id)


@router.get("/lists/{list_id}/cards/", response_model=List[schemas.Card])
async def read_cards_for_list(
    list_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_list = crud.get_list(db, list_id=list_id)

    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")

    db_board = db_list.board
    is_allowed = crud.is_user_allowed_access(db, board_id=db_board.id, user_id=current_user.id)

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Not authorized to access this board")

    return crud.get_cards_by_list(db, list_id=list_id, skip=skip, limit=limit)


@router.put("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    card: schemas.CardUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_card = crud.get_card(db, card_id=card_id)

    if db_card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    db_board = db_card.list.board
    is_allowed = crud.is_user_allowed_access(db, board_id=db_board.id, user_id=current_user.id)

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Not authorized to update a card on this board")

    return crud.update_card(db=db, db_card=db_card, card_in=card)


@router.delete("/cards/{card_id}", response_model=schemas.Card)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    db_card = crud.get_card(db, card_id=card_id)
    if db_card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    db_board = db_card.list.board
    is_allowed = crud.is_user_allowed_access(db, board_id=db_board.id, user_id=current_user.id)

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Not authorized to delete a card on this board")

    return crud.delete_card(db=db, db_card=db_card)


# --- PushToken エンドポイント (変更なし) ---

@router.post("/users/me/push-tokens", response_model=schemas.PushToken)
def register_push_token(
    token: schemas.PushTokenCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user),
):
    return crud.create_user_push_token(db=db, token=token, user_id=current_user.id)


# --- Debug エンドポイント (変更なし) ---

@router.get("/debug/users", response_model=List[schemas.User], include_in_schema=False)
def read_all_users_for_debug(
    db: Session = Depends(get_db),
):
    users = crud.get_users(db)
    return users


@router.get("/debug/users/{user_id}/boards", response_model=List[schemas.Board], include_in_schema=False)
def debug_get_user_boards(user_id: int, db: Session = Depends(get_db)):
    print(f"--- DEBUG: Fetching boards for user_id: {user_id} ---")
    boards = crud.get_boards_for_user(db, user_id=user_id)
    print(f"--- DEBUG: Found {len(boards)} boards for user_id: {user_id} ---")
    for board in boards:
        print(f"  - Board ID: {board.id}, Title: {board.title}, Owner ID: {board.owner_id}")
        member_ids = [member.id for member in board.members]
        print(f"    Members: {member_ids}")
    return boards


@router.websocket("/ws/boards/{board_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    board_id: int, 
    token: str = Query(..., description="jwt Bearer token for authentication")
):
    db: Session = None
    current_user: models.User = None
    try:
        # 1. ユーザー認証と許可
        db = next(get_db())
        try:
            current_user = auth.get_current_user_from_token(token, db)
        except HTTPException as e:
            # 認証失敗: WebSocketエラーコードで切断
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=e.detail)
            return

        # ボードへのアクセス権限を✔する (is_user_member_of_board を is_user_allowed_access に置き換える前提)
        db_board = crud.get_board(db, board_id=board_id)
        if db_board is None :
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Board not found")
            return

        # 【修正】統合された認可チェックを使用
        is_allowed = crud.is_user_allowed_access(db, board_id=board_id, user_id=current_user.id)
        
        if not is_allowed:
            # アクセス権がない
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Not authorized")
            return
        
        # 2. 接続の登録と維持
        await websocket.accept() # 接続承認を認証・認可が成功した直後に行う
        await manager.connect(websocket, board_id)
        
        # 接続開始をほかのユーザーに通知 (オプション)
        join_message = {
            "type": "USER_JOINED",
            "data": {
                "user_id": current_user.id,
                "email": current_user.email,
                "board_id": board_id
            }
        }
        await manager.broadcast(join_message, board_id)
        
        print(f"User {current_user.email} connected to board {board_id}")

        while True:
            data = await websocket.receive_text()
            # TODO: クライアントからのメッセージ処理
            
    except WebSocketDisconnect:
        # 正常な切断
        pass 
    except Exception as e:
        print(f"An unexpected error occurred in websocket for board {board_id}: {e}")

    finally: 
        # 3. 接続のクリーンアップと退出通知
        if current_user:
            manager.disconnect(websocket, board_id)
            leave_message = {
                "type": "USER_LEFT",
                "data": {"user_id": current_user.id, "board_id": board_id}
            }
            # ブロードキャストは認証が成功している場合にのみ試みる
            await manager.broadcast(leave_message, board_id)
        if db:
            db.close()

app.include_router(router)