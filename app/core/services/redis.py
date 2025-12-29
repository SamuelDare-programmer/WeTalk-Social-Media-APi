import redis.asyncio as redis
from ..config import settings

JTI_EXPIRY = settings.JTI_EXPIRY


# Use settings from config
pool = redis.ConnectionPool(
    host=settings.REDIS_HOST,
    port=int(settings.REDIS_PORT),
    db=settings.REDIS_DB,
    decode_responses=settings.DECODE_RESPONSES,
    username=settings.REDIS_USERNAME,
    password=settings.REDIS_PASSWORD,
    max_connections=10,  # <--- THIS IS THE KEY FIX
)

# 2. Initialize the Redis client using that pool
token_blocklist = redis.Redis(connection_pool=pool)
async def add_jti_to_blocklist(jti: str):
    await token_blocklist.set(name=jti, value="1", ex=JTI_EXPIRY)

async def jti_in_blocklist(jti: str) -> bool:
    if token_blocklist is None:
        print(f"Warning: Redis unavailable, cannot check blocklist for {jti}")
        return False
    
    try:
        is_true = await token_blocklist.get(jti)
        return True if is_true is not None else False
    except Exception as e:
        print(f"Redis error checking blocklist: {e}")
        return False