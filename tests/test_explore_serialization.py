import asyncio
from beanie import init_beanie
from pymongo import AsyncMongoClient
from app.core.config import settings
from app.core.db.models import User, UserFollows, UserBlocks
from app.posts.models import Post, Media
from app.discovery.models import Hashtag, PostTag, Location
from app.posts.schemas import PostResponse
from app.discovery.service import DiscoveryService

async def test_serialization():
    print("Connecting to DB...")
    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[
        User, UserFollows, UserBlocks, Post, Media, Location, Hashtag, PostTag
    ])
    
    print("\n--- Testing Service & Serialization ---")
    service = DiscoveryService()
    # Mock current user ID (doesn't matter much for this test if we just want to see structure)
    user_id = "000000000000000000000000" 
    
    # 1. Test "All"
    posts = await service.get_explore_feed(user_id, limit=5)
    print(f"Found {len(posts)} posts for 'All'")
    
    for p in posts:
        # Replicating logic from routes.py
        try:
            resp = PostResponse(
                id=str(p.id),
                owner_id=p.owner_id,
                caption=p.caption,
                media=[
                    {
                        "media_id": str(m.id),
                        "view_link": m.view_link,
                        "media_type": m.media_type
                    } for m in p.media
                ] if p.media else [],
                likes_count=p.likes_count,
                comments_count=p.comments_count,
                created_at=p.created_at
            )
            # Dump to dict as API would
            data = resp.model_dump(by_alias=True)
            print(f"Post {data.get('_id', data.get('id', 'MISSING'))}") # Check both alias and name
            for m in data.get('media', []):
                print(f"  - View Link: {m.get('view_link', 'MISSING')}")
                print(f"  - Media Type: {m.get('media_type', 'MISSING')}")
        except Exception as e:
            print(f"Serialization Error for Post {p.id}: {e}")

    # 2. Test "Video" Filter
    print("\n--- Testing Video Filter ---")
    video_posts = await service.get_explore_feed(user_id, limit=5, media_type="video")
    print(f"Found {len(video_posts)} video posts")
    for p in video_posts:
        print(f"Post {p.id} - Media Types: {[m.file_type for m in p.media]}")

    client.close()

if __name__ == "__main__":
    asyncio.run(test_serialization())
