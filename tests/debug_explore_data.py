import asyncio
from beanie import init_beanie
from pymongo import AsyncMongoClient
from app.core.config import settings
from app.core.db.models import User, UserFollows, UserBlocks
from app.posts.models import Post, Media
from app.engagement.models import PostLike, Comment, Bookmark, CommentLike
from app.discovery.models import Hashtag, PostTag, Location
from app.stories.models import Story, StoryView
from app.messenger.models import Conversation, Message
from app.notification.models import Notification

async def inspect_data():
    print("Connecting to DB...")
    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[
        User, UserFollows, UserBlocks, 
        Post, Media, 
        PostLike, Comment, Bookmark, CommentLike, 
        Hashtag, PostTag, Location,
        Story, StoryView,
        Conversation, Message,
        Notification
    ])
    print("Connected.")
    
    print("\n--- Inspecting Posts ---")
    posts = await Post.find({}, fetch_links=True).limit(10).to_list()
    for p in posts:
        print(f"Post ID: {p.id}")
        if not p.media:
            print("  No Media")
            continue
            
        for m in p.media:
            print(f"  Media ID: {m.id}")
            print(f"  Type: {m.file_type} (Raw: {getattr(m, 'file_type', 'N/A')})")
            print(f"  View Link: {m.view_link}")
            print(f"  URL field: {getattr(m, 'url', 'N/A')}")
            print("-" * 20)

    print("\n--- Counting Media Types ---")
    video_count = await Media.find({"file_type": "video"}).count()
    image_count = await Media.find({"file_type": "image"}).count()
    print(f"Videos: {video_count}")
    print(f"Images: {image_count}")

    client.close()

if __name__ == "__main__":
    asyncio.run(inspect_data())
