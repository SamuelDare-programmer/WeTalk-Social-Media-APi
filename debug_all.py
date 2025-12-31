import asyncio
from pymongo import AsyncMongoClient
import os
from datetime import datetime, timezone

async def debug_all():
    # Use the connection string from settings or default
    client = AsyncMongoClient("mongodb://localhost:27017")
    db = client["instagram_db"]
    
    print("--- Users ---")
    users = await db["users"].find().to_list(100)
    for u in users:
        print(f"User: {u['username']} | ID: {u['_id']}")
    
    print("\n--- Stories ---")
    stories = await db["stories"].find().to_list(100)
    now = datetime.now(timezone.utc)
    for s in stories:
        expires = s.get("expires_at")
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        active = expires > now if expires else "N/A"
        print(f"Story ID: {s['_id']} | Owner: {s.get('owner_id')} | Active: {active} | Expires: {expires}")

    print("\n--- Follows ---")
    follows = await db["user_follows"].find().to_list(100)
    for f in follows:
        print(f"Follower: {f.get('follower_id')} | Following: {f.get('following_id')}")

    await client.close()

if __name__ == "__main__":
    asyncio.run(debug_all())
