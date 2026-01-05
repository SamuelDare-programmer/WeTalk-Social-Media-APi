import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def check():
    print(f"Connecting to DB: {settings.DB_NAME}")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    pipeline = [
        # Same lookup and filter as the service
        {
            "$lookup": {
                "from": "media",
                "localField": "media.$id", 
                "foreignField": "_id",
                "as": "media_docs"
            }
        },
        {"$match": {
            "$or": [
                {"media_docs.file_type": "video"},
                {"media_docs.view_link": {"$regex": "/video/upload/"}}
            ]
        }},
        {"$limit": 100},
        # Group by owner to see distribution
        {
            "$group": {
                "_id": "$owner_id",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}}
    ]
    
    print("Running distribution analysis...")
    results = await db.posts.aggregate(pipeline).to_list(None)
    
    print(f"Found {len(results)} users with video posts.")
    for r in results:
        print(f"User: {r['_id']} | Count: {r['count']}")

if __name__ == "__main__":
    asyncio.run(check())
