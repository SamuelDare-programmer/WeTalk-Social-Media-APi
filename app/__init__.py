from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from pymongo import AsyncMongoClient
from beanie import init_beanie
from app.core.config import settings, configure_cloudinary
# from app.core.db.database import get_database
from app.core.auth.routes import router as auth_router
# from app.core.services.upload import router as upload_router
from app.posts.routes import router as posts_router
from app.core.errors import register_exceptions
from app.core.db.models import User, UserFollows, UserBlocks
from app.posts.models import Post, Media
from app.engagement.models import PostLike, Comment, Bookmark, CommentLike
from fastapi.middleware.cors import CORSMiddleware
from app.posts.routes import router as posts_router
from app.feed.routes import router as feed_router
from app.following.routes import router as following_router
from app.engagement.routes import router as engagement_router
from app.discovery.routes import router as discovery_router
from app.discovery.models import Hashtag, PostTag, Location
# from app.main import router as main_router

version = "v1"
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    configure_cloudinary()
    print("✅ Cloudinary Configured Successfully")
    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User, UserFollows, UserBlocks, Post, Media, PostLike, Comment, Bookmark, CommentLike, Hashtag, PostTag, Location])
    print("✅ MongoDB Connected")
    yield
    # SHUTDOWN
    await client.close()
    print("❌ MongoDB Closed")


app = FastAPI(
    title="WeTalk API",
    description="Social media API for posting, engagement, user connections, and content discovery.",
    lifespan=lifespan
)

register_exceptions(app)

@app.get("/health")
async def health_check():
    try:
        await User.count()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "details": str(e)}
    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Or ["*"] for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
    
app.include_router(
    prefix=f"/api/{version}", router=auth_router)

app.include_router(
    prefix=f"/api/{version}", router=feed_router)

app.include_router(
    prefix=f"/api/{version}", router=following_router)

app.include_router(
    prefix=f"/api/{version}", router=engagement_router)

app.include_router(
    prefix=f"/api/{version}", router=posts_router)

app.include_router(
    prefix=f"/api/{version}", router=discovery_router)
