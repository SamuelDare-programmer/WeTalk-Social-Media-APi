
import asyncio
from beanie import init_beanie, PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.db.models import User, UserFollows, UserBlocks
from app.posts.models import Media, MediaType, MediaStatus, Post
from app.engagement.models import PostLike, Comment, Bookmark, CommentLike
from app.discovery.models import Hashtag, PostTag, Location
from app.stories.models import Story, StoryView
from app.stories.service import StoryService
from app.stories.schemas import CreateStoryRequest
from app.core.config import settings
import uuid

async def test_minimal():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["instagram_db"]
    # Initialize all models as in app/__init__.py to avoid hanging on Links
    await init_beanie(database=db, document_models=[
        User, UserFollows, UserBlocks, 
        Post, Media, 
        PostLike, Comment, Bookmark, CommentLike, 
        Hashtag, PostTag, Location,
        Story, StoryView
    ])

    print("Checking for existing stories...")
    count = await Story.count()
    print(f"Total Stories in DB: {count}")

    # Fetch one if exists
    if count > 0:
        s = await Story.find_one(fetch_links=True)
        print(f"Found story: {s.id} for owner {s.owner_id}")
        media = await s.media.fetch()
        print(f"Associated Media view_link: {media.view_link if media else 'Missing'}")

    print("Success: Beanie initialized and DB queried.")

if __name__ == "__main__":
    asyncio.run(test_minimal())
