import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from bson import ObjectId

async def check():
    print(f"Connecting to DB: {settings.DB_NAME}")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]
    
    # Target Post ID (associated with the media)
    target_post_id = ObjectId("695b781292cf3e40a98d7202")
    
    print(f"Testing Discovery Capability for Post: {target_post_id}")

    # 1. Simulate the EXACT pipeline from DiscoveryService (Logic Check)
    # We remove the $sample/limit stage to see if it is in the *eligible pool*
    pipeline = [
        # Filter out blocked authors (Assuming no blocks for this test context)
        {"$match": {"owner_id": {"$nin": []}}},
        
        # EXACT Lookup from service.py
        {
            "$lookup": {
                "from": "media",
                "localField": "media.$id", 
                "foreignField": "_id",
                "as": "media_docs"
            }
        },
        
        # EXACT Match from service.py
        {"$match": {
            "$or": [
                {"media_docs.file_type": "video"},
                {"media_docs.view_link": {"$regex": "/video/upload/"}}
            ]
        }}
    ]
    
    print("Running Full Aggregation scan...")
    # Get ALL matching IDs
    results = await db.posts.aggregate(pipeline).to_list(None)
    
    # Check existence
    found_ids = [doc["_id"] for doc in results]
    
    if target_post_id in found_ids:
        print(f"\n✅ SUCCESS: Post {target_post_id} IS founded by the Discovery Logic.")
        print("The /discovery/shorts endpoint IS CAPABLE of returning this video.")
        print(f"Total eligible video posts found: {len(found_ids)}")
    else:
        print(f"\n❌ FAILURE: Post {target_post_id} was NOT found in the eligible pool.")
        print("Checking why...")
        # Inspect the specific doc again
        doc = await db.posts.find_one({"_id": target_post_id})
        print(f"Document Dump: {doc}")

if __name__ == "__main__":
    asyncio.run(check())
