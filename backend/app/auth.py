# backend/app/auth.py

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# 他のモジュールから必要なものをインポート
from . import crud, models, schemas
from .database import SessionLocal

# --- JWT Settings ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- OAuth2 Scheme ---
# FastAPIに、トークンがどこでどのように提供されるかを教えます。
# tokenUrl="api/auth/login" は、クライアントがトークンを取得するためのエンドポイントを指定します。
# クライアントはまず/api/auth/loginにPOSTリクエストを送り、トークンを取得してから、保護されたAPIを呼び出します。
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- ここから追加: 現在のユーザーを取得する依存関係 --- #
#　　依存性の注入
def get_db():
    """DBセッションを取得するための依存関係（main.pyから移動）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """
    トークンを検証し、現在のログインユーザーを返すための依存関係関数。
    保護したいAPIエンドポイントで、この関数をDependsを使って呼び出します。
    """
    # 認証情報が不正な場合に投げる例外
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # トークンをデコードしてペイロード（中身）を取得します。
        # 期限切れや署名が不正な場合はJWTErrorが発生します。
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            # ペイロードにsub(subject)がなければエラー
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        # デコードに失敗したらエラー
        raise credentials_exception
    
    # ペイロードのemailを使って、データベースからユーザー情報を取得します。
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        # ユーザーが見つからなければエラー
        raise credentials_exception
    
    # ユーザーオブジェクトを返します。
    return user
