import asyncio
from typing import List, Dict

from fastapi import Depends, FastAPI, HTTPException, status, APIRouter, WebSocket, WebSocketDisconnect

# --- ここからWebSocket関連の実装 --- 

class ConnectionManager:
    """
    WebSocket接続を管理するクラス。 誰が今オンライン化を覚えて、メッセージを配信する役割
    """
    def __init__(self):
        # ボードIDをキーとし、そのボードに接続しているWebSocketのリストを値とする辞書
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, board_id: int):
        """
        新しいWebSocket接続を受け入れ、管理下に追加します。
        """
        await websocket.accept()
        
        if board_id not in self.active_connections:
            self.active_connections[board_id] = []
            
        self.active_connections[board_id].append(websocket)
        

    def disconnect(self, websocket: WebSocket, board_id: int):
        """
        切断されたWebSocket接続を管理下から削除します。
        """
        if board_id in self.active_connections:
            self.active_connections[board_id].remove(websocket)
            
            #リストが空になったら、辞書のエントリも削除してメモリ解放
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

    async def broadcast(self, message: dict, board_id: int):
        """
        指定されたボードIDに接続しているすべてのクライアントにJSONメッセージを送信（ブロードキャスト）します。
        """
       
        if board_id in self.active_connections:
            #ブロードキャストは非同期処理で、同時に多数のユーザーに送ります
            #送信中のエラーをハンドリングし、接続が切れている場合はリストから削除すべきです
            
            #接続が有効なwebsocketのみのリスト
            valid_connections = []
            
            #すべての送信処理を並行して実行するためのタスクリスト
            send_tasks = []
            
            for connection in self.active_connections[board_id]:
                #接続の有効性を確認し、タスクに追加
                send_tasks.append(connection.send_json(message))
                valid_connections.append(connection) #いったんすべて有効としてリストに追加
                
            #すべての送信タスクを並行して実行
            # asyncio.gatherを使うと、どれか一つ失敗しても、他は実行され続けます
            results = await asyncio.gather(*send_tasks, return_exceptions=True)
            
            #エラー処理（接断されている接続をリストから削除する）
            connections_to_remove = []
            for i, result in enumerate(results):
                if isinstance(result,Exception):
                    #送信に失敗した接続を削除リストに追加
                    connections_to_remove.append(valid_connections[i])
                    
            for connection in connections_to_remove:
                #辞書から切断された接続を削除
                if board_id in self.acrtive_connections and connection in self.active_connections[board_id]:
                    self.active_connections[board_id].remove(connection)
                    
            if board_id in self.active_connections and not self.active_conenections[board_id]:
                del self.active_connections[board_id]

# ConnectionManagerのインスタンスを作成
manager = ConnectionManager()

# --- WebSocket関連の実装ここまで ---


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


@router.websocket("/ws/boards/{board_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    board_id: int, 
    #クエリパラメーターから認証トークンを受け取る
    token: str = Query(..., description="jwt Bearer token for authentication")
):
    await websocket.accept()
    
    db: Session = None 
    current_user = None 
    
    try: 
        #1 ユーザー認証と許可
        #dbセッションを手動で取得
        db = next(get_db())
        
        #トークンによるユーザー認証
        current_user = auth.get_current_user_from_token(token, db)
        #ボードへのアクセス権限を✔する
        db_board = crud.get_board(db, board_id=board_id)
        if db_board is None :
            raise HTTPException(status_code=404, detail="Board not found")
        is_owner = db_board.owner_id == current_user.id 
        is_member = current_user.id in [member.id for member in db_board.members]
        
        if not(is_owner or is_member):
            #アクセス権がない
            raise HTTPException(status_code=403, detail="Not authorized to access this board")
        
        #2接続の登録と維持
        await manager.connect(websocket, board_id)
        
        #接続開始をほかのユーザーに通知
        join_message = {
            "type": "USER_JOINED",
            "data": {
                "user_id": current_user.id,
                "email": current_user.email, #"ユーザー識別のために送る"
                "board_id": board_id
            }
        }
        await manager.broadcast(join_message, board_id)
        
        print(f"User {current_user.id} connected to board {board_id}") #ログ出力
        
        while True:
            #クライアントからのメッセージ(ping/pong,かーそる移動,チャット)を待機
            #この行がブロックされることで、接続が維持され、切断時に例外が発生する
            data = await websocket.receive_text()
            
            #Todo:クライアントからのメッセージ処理をここに追加（例: カーソル位置のブロードキャスト）
            #await:manager.broadcast({"type": "CURSOR_UPDATE","data": json.loads(data)}, board_id)
    except WebSocketDisconnect:
        pass 
    except HTTPException as e: 
        #認証または許可のエラー(401,403,404)
        #接続を閉じて、理由をクライアントに伝えます
        close_code = status.WS_1008_POLICY_VIOLATION
        await websocket.close(code=close_code)
        
    finally: 
        #3接続の処理と退出許可
        if current_user:#認証が完了、ユーザーidが確定してる場合のみ
            manager.disconnect(websocket, board_id)
            
            #他の接続ユーザーに退出を通知
             
            leave_message = {
                
            "type": "USER_LEFT",
            "data": {
                "user_id":current_user.id,
                "board_id":board_id
            }}
            await manager.broadcast(leave_message, board_id)
            print(f"User {current_user.id} disconnected from board {board_id}") #ログ出力
            if db:
                db.close()
app.include_router(router)