
import asyncio
import httpx

async def final_api_check():
    # We need a token. We can't easily get one without login.
    # But we can check the service method directly again.
    from app.stories.service import StoryService
    from beanie import init_beanie
    from motor.motor_asyncio import AsyncIOMotorClient
    from app.core.db.models import User, UserFollows, UserBlocks
    from app.posts.models import Media, Post
    from app.engagement.models import PostLike, Comment, Bookmark, CommentLike
    from app.discovery.models import Hashtag, PostTag, Location
    from app.stories.models import Story, StoryView

    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["instagram_db"]
    await init_beanie(database=db, document_models=[
        User, UserFollows, UserBlocks, Post, Media, PostLike, Comment, Bookmark, CommentLike, Hashtag, PostTag, Location, Story, StoryView
    ])

    # Test as a specific user (one of the owners from previous check)
    user_id = "6951fd56e8e78c1491448c22" 
    feed = await StoryService.get_stories_feed(user_id)
    print(f"API Check: Feed successfully retrieved. Items: {len(feed)}")
    for item in feed:
        print(f"User: {item.username}, Story Count: {len(item.stories)}")
        for s in item.stories:
            print(f"  - ID: {s.id}, Viewed: {s.viewed}")
            if not s.id:
                 print("  ERROR: Story ID is missing!")

if __name__ == "__main__":
    asyncio.run(final_api_check())
