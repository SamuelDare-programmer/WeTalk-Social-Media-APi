from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from pymongo import AsyncMongoClient
from beanie import init_beanie
from app.core.config import settings
# from app.core.db.database import get_database
from app.core.auth.routes import router as auth_router
from app.core.exceptions import register_exceptions
from app.core.db.models import UserModel

version = "v1"
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[UserModel])
    print("✅ MongoDB Connected")
    yield
    # SHUTDOWN
    await client.close()
    print("❌ MongoDB Closed")


app = FastAPI(
    title="WeTalk API",
    description="Social media api for posting, liking commenting and resharing features",
    lifespan=lifespan
)

register_exceptions(app)

@app.get("/health")
async def health_check():
    try:
        await UserModel.count()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "details": str(e)}
    
app.include_router(
    prefix=f"/api/{version}", router=auth_router)