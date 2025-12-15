from pwdlib import PasswordHash
import jwt
from app.core.config import settings
from jwt import PyJWTError
import uuid
from datetime import datetime, timedelta

pwd_context = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_data:dict, expiry: timedelta | None = None, refresh: bool = False) -> str:
    payload = {}

    payload["user_data"] = user_data
    payload["exp"] = datetime.now() + (expiry if  expiry is not None else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload["jti"] = str(uuid.uuid4())
    payload["refresh"] = refresh

    token = jwt.encode(payload = payload, key= settings.SECRET_KEY, algorithm= settings.ALGORITHM)

    return token

def decode_access_token(token: str) -> dict | None:
    try:
        token = jwt.decode(jwt=token, key=settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return token
    except PyJWTError:
        return None