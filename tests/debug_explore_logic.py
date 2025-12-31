import asyncio
from beanie import init_beanie
from pymongo import AsyncMongoClient
from app.core.config import settings
from app.core.db.models import User, UserFollows, UserBlocks
from app.posts.models import Post, Media
from app.discovery.models import Hashtag, PostTag, Location
from app.notification.models import Notification
from app.stories.models import Story, StoryView
from app.messenger.models import Conversation, Message
from app.engagement.models import PostLike, Comment, Bookmark, CommentLike

async def debug_logic():
    print("Connecting to DB...")
    client = AsyncMongoClient(settings.MONGODB_URL)
    # Initialize ALL models to be safe
    await init_beanie(database=client[settings.DB_NAME], document_models=[
        User, UserFollows, UserBlocks, 
        Post, Media, 
        PostLike, Comment, Bookmark, CommentLike, 
        Hashtag, PostTag, Location,
        Story, StoryView,
        Conversation, Message,
        Notification
    ])
    
    print("\n--- Simulation Configuration ---")
    limit = 20
    # Simulate a user ID that likely doesn't exist to see "Global" explore feed
    dummy_user_id = "000000000000000000000000" 
    
    query = {"owner_id": {"$nin": [dummy_user_id]}}
    
    print("\n--- Checking Raw Counts ---")
    total_posts = await Post.find(query).count()
    print(f"Total Posts (excluding dummy): {total_posts}")
    
    print("\n--- Replicating 'All' Query ---")
    # Exact sort logic from Service
    posts_all = await Post.find(query, fetch_links=True).sort("-likes_count", "-comments_count", "-created_at").limit(limit).to_list()
    print(f"Top {limit} Posts by Engagement:")
    for p in posts_all:
        has_video = p.media and any(m.file_type == "video" for m in p.media)
        print(f"  [{str(p.id)}] Likes: {p.likes_count} | Media: {len(p.media)} | Has Video: {has_video}")
        if has_video:
            for m in p.media:
                if m.file_type == "video":
                    print(f"    - Vid ID: {m.id} | FileType: {m.file_type} (val: {m.file_type.value})")

    print("\n--- Replicating 'Video' Query ---")
    media_type = "video"
    # Replicating the Service logic with increased limit
    posts_fetched = await Post.find(query, fetch_links=True).sort("-likes_count", "-comments_count", "-created_at").limit(limit * 5).to_list()
    print(f"Fetched {len(posts_fetched)} candidates (Limit * 5)")
    
    filtered_videos = [p for p in posts_fetched if p.media and any(m.file_type == media_type for m in p.media)]
    print(f"Filtered Videos: {len(filtered_videos)}")
    
    for p in filtered_videos[:5]:
         print(f"  [{str(p.id)}] Likes: {p.likes_count} | Media: {len(p.media)}")
         for m in p.media:
             print(f"    - Type: {m.file_type} | Val: {m.file_type.value} | Match: {m.file_type == media_type}")

    client.close()

if __name__ == "__main__":
    asyncio.run(debug_logic())
