import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_database()
    # Find a post that has a non-empty media list
    post = await db.posts.find_one({'media': {'$exists': True, '$ne': []}})
    if post:
        print(f"Raw Post ID: {post['_id']}")
        print(f"Raw Post Media Field: {post.get('media')}")
        if 'media' in post and len(post['media']) > 0:
            item = post['media'][0]
            print(f"First Media Item Type: {type(item)}")
    else:
        print('No posts with media found')

if __name__ == "__main__":
    asyncio.run(check())
