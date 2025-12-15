from pwdlib import PasswordHash
import jwt
from app.core.config import settings
import uuid
from datetime import datetime, timedelta
import logging

# Initialize Password Hasher
pwd_context = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expiry: timedelta | None = None, refresh: bool = False) -> str:
    # 1. Start with a copy of the input data (e.g., {"sub": "user_id"})
    payload = data.copy() 

    # 2. Add Expiration
    expire = datetime.utcnow() + (expiry if expiry else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": expire})

    # 3. Add JTI (Unique Identifier for the token)
    payload.update({"jti": str(uuid.uuid4())})
    
    # 4. Add Refresh Flag
    payload.update({"refresh": refresh})

    # 5. Encode
    # Ensure 'sub' is a string if it exists in data (Safety check)
    if "sub" in payload:
        payload["sub"] = str(payload["sub"])

    token = jwt.encode(payload=payload, key=settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return token

def decode_access_token(token: str) -> dict | None:
    try:
        token_data = jwt.decode(
            jwt=token, 
            key=settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        return token_data
    except jwt.PyJWTError as e:
        logging.exception(e)
        return None