import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    # Search by filename or part of the view_link
    filename_part = "ewdk13unfdbbom7vejsa"
    
    print(f"Searching for media with filename containing: {filename_part}")
    
    media_item = await db.media.find_one({"view_link": {"$regex": filename_part}})
    
    if media_item:
        print("Found Media Item:")
        print(f"ID: {media_item['_id']}")
        print(f"File Type: {media_item.get('file_type')}")
        print(f"Media Type (MIME): {media_item.get('media_type')}")
        print(f"View Link: {media_item.get('view_link')}")
        print(f"Status: {media_item.get('status')}")
    else:
        print("Media item not found.")

if __name__ == "__main__":
    asyncio.run(check())
