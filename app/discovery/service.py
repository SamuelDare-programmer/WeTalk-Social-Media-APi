from app.discovery.models import Hashtag, PostTag, Location
from app.posts.models import Post
from app.core.db.models import User, UserFollows, UserBlocks, FollowStatus
from beanie import PydanticObjectId
from typing import List, Dict, Any, Optional
import httpx
import asyncio
from app.core.config import settings

class DiscoveryService:
    async def get_trending_hashtags(self, limit: int = 10) -> List[Hashtag]:
        return await Hashtag.find_all().sort("-post_count").limit(limit).to_list()

    async def search_hashtags(self, query: str, limit: int = 10) -> List[Hashtag]:
        # Regex search for autocomplete (Match from start)
        return await Hashtag.find({"name": {"$regex": f"^{query}", "$options": "i"}}).limit(limit).to_list()

    async def search_locations(self, query: str, limit: int = 20) -> List[Location]:
        query = query.strip()
        if not query: 
            return []
        
        # 1. Search Local DB first
        local_results = await Location.find({"name": {"$regex": query, "$options": "i"}}).limit(limit).to_list()
        
        # If we have enough local results, return them to save API calls
        if len(local_results) >= 5:
            return local_results

        # 2. Search External API (Radar.io)
        external_data = await self._fetch_radar_locations(query, limit)
        
        # 3. Merge & Cache (Write on Demand)
        final_results = list(local_results)
        existing_ids = {str(loc.provider_id) for loc in local_results if loc.provider_id}
        
        for item in external_data:
            ext_id = item["provider_id"]
            if ext_id in existing_ids:
                continue
                
            # Double check DB to prevent race conditions
            cached_loc = await Location.find_one({"provider_id": ext_id})
            if cached_loc:
                final_results.append(cached_loc)
                existing_ids.add(ext_id)
            else:
                # Create new document
                new_loc = Location(
                    name=item["name"],
                    location={"type": "Point", "coordinates": [item["coordinates"]["lng"], item["coordinates"]["lat"]]},
                    provider_id=ext_id,
                    provider="radar",
                    address=item.get("full_address")
                )
                await new_loc.save()
                final_results.append(new_loc)
                existing_ids.add(ext_id)
        
        return final_results[:limit]

    async def search_users(self, query: str, current_user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        query = query.strip().lower()
        if not query:
            return []

        # 1. Search Users (Username or Name)
        regex_pattern = {"$regex": query, "$options": "i"}
        users = await User.find({
            "$or": [
                {"username": regex_pattern},
                {"first_name": regex_pattern},
                {"last_name": regex_pattern}
            ]
        }).limit(50).to_list() # Fetch more than limit to allow re-ranking
        
        if not users:
            return []

        user_ids = [str(u.id) for u in users]
        
        # 2. Check Connections (Friend-of-Friend / Direct Follows)
        # "I follow them"
        i_follow = await UserFollows.find({
            "follower_id": current_user_id,
            "following_id": {"$in": user_ids},
            "status": FollowStatus.ACTIVE
        }).to_list()
        following_ids = {f.following_id for f in i_follow}
        
        # "They follow me"
        follows_me = await UserFollows.find({
            "follower_id": {"$in": user_ids},
            "following_id": current_user_id,
            "status": FollowStatus.ACTIVE
        }).to_list()
        follower_ids = {f.follower_id for f in follows_me}
        
        results = []
        for user in users:
            uid = str(user.id)
            score = 0
            if uid in following_ids: score += 2
            if uid in follower_ids: score += 1
            
            results.append({
                "_id": uid,
                "username": user.username,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
                "avatar_url": user.avatar_url,
                "is_following": uid in following_ids,
                "score": score
            })
            
        # 3. Sort by Score (Desc), then Username (Asc)
        results.sort(key=lambda x: x["username"]) 
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return results[:limit]

    async def get_posts_by_hashtag(self, hashtag_name: str, limit: int = 20, offset: int = 0, media_type: Optional[str] = None) -> List[Post]:
        # 1. Find Hashtag ID
        tag = await Hashtag.find_one({"name": hashtag_name})
        if not tag:
            return []
        
        # 2. Find PostTags
        post_tags = await PostTag.find(PostTag.hashtag_id == str(tag.id)).skip(offset).limit(limit).to_list()
        post_ids = [PydanticObjectId(pt.post_id) for pt in post_tags]
        
        # 3. Fetch Posts
        query = {"_id": {"$in": post_ids}}
        
        # 4. Media Type Filter (requires join/lookup if we want to be strict, but for explorer we can fetch and filter or add simpler check)
        # For hashtags, we'll fetch and then filter if media_type is provided, though pagination might be slightly off.
        # Better: use aggregation pipeline for strict filtering.
        
        posts = await Post.find(query, fetch_links=True).to_list()
        
        if media_type:
            posts = [p for p in posts if p.media and any(str(m.file_type) == media_type for m in p.media)]
            
        return posts

    async def get_suggested_users(self, current_user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
        # 1. Get IDs of users already followed
        following = await UserFollows.find({
            "follower_id": current_user_id,
            "status": FollowStatus.ACTIVE
        }).to_list()
        following_ids = {f.following_id for f in following}
        following_ids.add(current_user_id) # Exclude self
        
        # 2. Find top users by follower count who are NOT in following_ids
        top_users = await User.find({
            "_id": {"$nin": [PydanticObjectId(uid) for uid in following_ids if PydanticObjectId.is_valid(uid)]}
        }).sort("-followers_count").limit(limit).to_list()
        
        # 3. Format results
        return [{
            "id": str(u.id),
            "username": u.username,
            "full_name": f"{u.first_name} {u.last_name}".strip(),
            "avatar_url": u.avatar_url,
            "followers_count": u.followers_count
        } for u in top_users]

    async def get_explore_feed(self, current_user_id: str, limit: int = 20, offset: int = 0, media_type: Optional[str] = None) -> List[Post]:
        """
        Retrieves engaging content from users the current user does not follow.
        """
        # 1. Get Following and Blocked IDs
        following_task = UserFollows.find({
            "follower_id": current_user_id,
            "status": FollowStatus.ACTIVE
        }).to_list()
        
        blocked_task = UserBlocks.find({
            "$or": [
                {"blocker_id": current_user_id},
                {"blocked_id": current_user_id}
            ]
        }).to_list()
        
        following_records, blocked_records = await asyncio.gather(following_task, blocked_task)
        
        excluded_user_ids = {current_user_id}
        excluded_user_ids.update(r.following_id for r in following_records)
        excluded_user_ids.update(r.blocker_id for r in blocked_records)
        excluded_user_ids.update(r.blocked_id for r in blocked_records)

        # 2. Query Posts
        # Strategy: Freshness + Engagement weighting
        query = {"owner_id": {"$nin": list(excluded_user_ids)}}
        
        # If media_type is provided, we use aggregation to filter joined media
        if media_type:
            # Note: Complex aggregation for explore feed to handle links + filtering
            # For now, we'll use a simpler approach: fetch more and filter in memory if limit is small
            # Or ideally use $lookup. Since this is an explorer, fetching slightly more is fine.
            posts = await Post.find(query, fetch_links=True).sort("-likes_count", "-comments_count", "-created_at").skip(offset).limit(limit * 5).to_list()
            filtered = [p for p in posts if p.media and any(m.file_type == media_type for m in p.media)]
            return filtered[:limit]
            
        posts = await Post.find(
            query,
            fetch_links=True
        ).sort("-likes_count", "-comments_count", "-created_at").skip(offset).limit(limit).to_list()
        
        return posts

    # Helper to process tags when a post is created (to be called by PostService ideally)
    async def process_post_tags(self, post_id: str, tags: List[str]):
        for tag_name in tags:
            tag_name = tag_name.lower().replace("#", "")
            if not tag_name:
                continue
                
            # Find or Create Hashtag
            hashtag = await Hashtag.find_one({"name": tag_name})
            if not hashtag:
                hashtag = Hashtag(name=tag_name, post_count=0)
                await hashtag.insert()
            
            # Create Junction
            # Check if exists to avoid duplicates if logic runs multiple times
            exists = await PostTag.find_one({"post_id": post_id, "hashtag_id": str(hashtag.id)})
            if not exists:
                await PostTag(post_id=post_id, hashtag_id=str(hashtag.id)).insert()
                await hashtag.inc({Hashtag.post_count: 1})

    async def _fetch_radar_locations(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """
        Proxies the search to Radar.io.
        """
        url = "https://api.radar.io/v1/search/autocomplete"
        headers = {
            "Authorization": f"{settings.RADAR_SECRET_KEY}"
        }
        params = {
            "query": query,
            "limit": limit,
            "layers": "place,address"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, headers=headers)
                if response.status_code != 200:
                    return []
                
                data = response.json()
                results = []
                for address in data.get("addresses", []):
                    # Safely build address to avoid "undefined" bug
                    # Try formattedAddress first, but fallback to manual construction if it looks broken
                    clean_address = address.get("formattedAddress", "")
                    
                    if not clean_address or "undefined" in clean_address:
                        addr_parts = [
                            address.get("number"),
                            address.get("street"),
                            address.get("city"),
                            address.get("state"),
                            address.get("countryCode")
                        ]
                        # Filter out None or empty strings and join
                        clean_address = ", ".join([str(p).strip() for p in addr_parts if p])

                    results.append({
                        "provider_id": address.get("placeId") or address.get("id"),
                        "name": address.get("placeLabel") or address.get("addressLabel"),
                        "full_address": clean_address,
                        "coordinates": {"lat": address["latitude"], "lng": address["longitude"]}
                    })
                return results
            except Exception as e:
                print(f"Radar API Error: {e}")
                return []