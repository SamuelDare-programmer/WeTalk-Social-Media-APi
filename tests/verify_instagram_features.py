import asyncio
import httpx
import json
import secrets
import string
from typing import Dict, List

from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = "http://127.0.0.1:8000/api/v1"
MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "instagram_db"

def random_string(length=8):
    return "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(length))

async def create_user(client: httpx.AsyncClient) -> Dict:
    username = f"user_{random_string()}"
    email = f"{username}@example.com"
    password = "password123"
    
    # Registration
    reg_resp = await client.post(f"{BASE_URL}/auth/users/signup", json={
        "username": username,
        "email": email,
        "password": password,
        "first_name": "Test",
        "last_name": "User"
    })
    
    if reg_resp.status_code not in [200, 201]:
        print(f"Registration failed: {reg_resp.text}")
        raise Exception("Registration failed")

    # Manually verify user in DB
    m_client = AsyncIOMotorClient(MONGODB_URL)
    db = m_client[DB_NAME]
    await db.users.update_one({"username": username}, {"$set": {"is_verified": True}})
    m_client.close()
    
    # Login
    login_resp = await client.post(f"{BASE_URL}/auth/users/login", data={
        "username": username,
        "password": password
    })
    
    if login_resp.status_code != 202:
        print(f"Login failed: {login_resp.text}")
        raise Exception("Login failed")
        
    token = login_resp.json()["access_token"]
    
    # Get profile
    me_resp = await client.get(f"{BASE_URL}/auth/users/me", headers={"Authorization": f"Bearer {token}"})
    user_data = me_resp.json()
    user_data["token"] = token
    return user_data

async def verify_features():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("--- Step 1: Creating users ---")
        user1 = await create_user(client)
        user2 = await create_user(client)
        print(f"Created {user1['username']} and {user2['username']}")

        print("\n--- Step 2: User 1 posts with hashtag and mention ---")
        post_resp = await client.post(
            f"{BASE_URL}/posts/",
            json={
                "caption": f"Hello world #verify_test @{user2['username']}",
                "media_ids": []
            },
            headers={"Authorization": f"Bearer {user1['token']}"}
        )
        if post_resp.status_code != 201:
            print(f"Post creation failed: {post_resp.text}")
            raise Exception("Post creation failed")
            
        post_data = post_resp.json()
        post_id = post_data.get("id") or post_data.get("_id")
        print(f"Post created: {post_id}")

        print("\n--- Step 3: Verify User 2 received MENTION notification ---")
        await asyncio.sleep(1) # Wait for async processing
        notif_resp = await client.get(
            f"{BASE_URL}/notifications",
            headers={"Authorization": f"Bearer {user2['token']}"}
        )
        notifs = notif_resp.json()["items"]
        mention_notif = next((n for n in notifs if n["type"] == "mention"), None)
        assert mention_notif is not None, "Mention notification not found"
        print("Mention notification verified!")

        print("\n--- Step 4: User 2 comments with hashtag ---")
        comment_resp = await client.post(
            f"{BASE_URL}/posts/{post_id}/comments",
            json={"content": "Cool post! #comment_tag"},
            headers={"Authorization": f"Bearer {user2['token']}"}
        )
        print("Comment created")

        print("\n--- Step 5: Verify hashtags are indexed ---")
        # Check explore/tags
        tag_resp = await client.get(f"{BASE_URL}/discovery/tags/verify_test")
        assert tag_resp.status_code == 200, "Hashtag from post not found"
        
        tag_resp2 = await client.get(f"{BASE_URL}/discovery/tags/comment_tag")
        assert tag_resp2.status_code == 200, "Hashtag from comment not found"
        print("Hashtag indexing verified!")

        print("\n--- Step 6: Verify Explore Feed ---")
        # User 2 shouldn't see User 1's post if they follow them, but they don't follow yet
        explore_resp = await client.get(
            f"{BASE_URL}/discovery/explore",
            headers={"Authorization": f"Bearer {user2['token']}"}
        )
        explore_posts = explore_resp.json()
        assert any((p.get("id") or p.get("_id")) == post_id for p in explore_posts), "Post not found in explore feed"
        print("Explore feed verified!")

        print("\n--- Step 7: Verify Notifications for LIKE/COMMENT ---")
        # User 1 should have a notification for the comment
        await asyncio.sleep(1)
        notif_resp1 = await client.get(
            f"{BASE_URL}/notifications",
            headers={"Authorization": f"Bearer {user1['token']}"}
        )
        notifs1 = notif_resp1.json()["items"]
        comment_notif = next((n for n in notifs1 if n["type"] == "comment"), None)
        assert comment_notif is not None, "Comment notification not found for owner"
        print("Comment notification verified!")

        # Like
        await client.post(
            f"{BASE_URL}/posts/{post_id}/likes",
            headers={"Authorization": f"Bearer {user2['token']}"}
        )
        await asyncio.sleep(1)
        notif_resp1 = await client.get(
            f"{BASE_URL}/notifications",
            headers={"Authorization": f"Bearer {user1['token']}"}
        )
        notifs1 = notif_resp1.json()["items"]
        like_notif = next((n for n in notifs1 if n["type"] == "like"), None)
        assert like_notif is not None, "Like notification not found for owner"
        print("Like notification verified!")

        print("\n--- ALL FEATURES VERIFIED SUCCESSFULLY ---")

if __name__ == "__main__":
    try:
        asyncio.run(verify_features())
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        import traceback
        traceback.print_exc()
