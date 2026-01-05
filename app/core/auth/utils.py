from pwdlib import PasswordHash
import jwt
from app.core.config import settings
import uuid
from datetime import datetime, timedelta
import logging
from itsdangerous import URLSafeTimedSerializer

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
    if expiry:
        expire = datetime.utcnow() + expiry
    else:
        minutes = settings.REFRESH_TOKEN_EXPIRE_MINUTES if refresh else settings.ACCESS_TOKEN_EXPIRE_MINUTES
        expire = datetime.utcnow() + timedelta(minutes=minutes)
    
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
    
def google_sub_to_uuid(google_sub: str) -> uuid.UUID:
    """Convert Google sub to deterministic UUID using namespace"""
    # Use a namespace UUID from settings
    GOOGLE_NAMESPACE = uuid.UUID(settings.google_namespace_uuid)
    
    # Generate UUID5 from Google sub
    return uuid.uuid5(GOOGLE_NAMESPACE, google_sub)

serializer = URLSafeTimedSerializer(secret_key=settings.SECRET_KEY, salt=settings.URL_SAFE_SERIALIZER_SALT)

def create_url_safe_token(data:dict):
    token = serializer.dumps(data)

    return token

def decode_url_safe_token(token:str):
    try:
        token_details = serializer.loads(token, max_age=1800)
        return token_details
    except Exception as e:
        logging.error(str(e))

