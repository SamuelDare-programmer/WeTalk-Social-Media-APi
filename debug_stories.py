import asyncio
from pymongo import AsyncMongoClient
from datetime import datetime, timezone

async def check_stories():
    client = AsyncMongoClient("mongodb://localhost:27017")
    db = client["instagram_db"]
    
    # Check all stories in "stories" collection
    all_stories = await db["stories"].find().to_list(100)
    print(f"Total stories in DB: {len(all_stories)}")
    
    now = datetime.now(timezone.utc)
    for s in all_stories:
        created = s.get("created_at")
        expires = s.get("expires_at")
        owner = s.get("owner_id")
        
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
            
        active = expires > now if expires else "N/A"
        print(f"Story ID: {s['_id']}, Owner: {owner}, Created: {created}, Expires: {expires}, Active: {active}")

if __name__ == "__main__":
    asyncio.run(check_stories())
