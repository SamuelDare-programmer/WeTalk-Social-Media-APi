from app.discovery.models import Hashtag, PostTag, Location
from app.posts.models import Post
from app.core.db.models import User, UserFollows, UserBlocks, FollowStatus
from beanie import PydanticObjectId
from typing import List, Dict, Any, Optional
import httpx
import asyncio
import random
from app.core.config import settings

class DiscoveryService:
    async def get_trending_hashtags(self, limit: int = 10) -> List[Hashtag]:
        return await Hashtag.find_all().sort("-post_count").limit(limit).to_list()

    async def search_hashtags(self, query: str, limit: int = 10) -> List[Hashtag]:
        # Regex search for autocomplete (Match from start)
        return await Hashtag.find({"name": {"$regex": f"^{query}", "$options": "i"}}).limit(limit).to_list()

    async def search_locations(self, query: str, limit: int = 20, lat: Optional[float] = None, lng: Optional[float] = None) -> List[Location]:
        query = query.strip()
        if not query: 
            return []
        
        # 1. Search Local DB first
        # (Optional: Use geospatial query if lat/lng provided, but regex is fine for now)
        local_results = await Location.find({"name": {"$regex": query, "$options": "i"}}).limit(limit).to_list()
        
        # If we have enough local results, return them to save API calls
        if len(local_results) >= 5:
            return local_results

        # 2. Search External API (Radar.io)
        external_data = await self._fetch_radar_locations(query, limit, lat, lng)
        
        # 3. Merge & Cache (Write on Demand)
        # If we reached here, local results were insufficient (< 5). 
        # We prioritize external results to ensure relevance and filter out stale/weak local matches.
        final_results = list(local_results)
        existing_ids = {loc.provider_id for loc in local_results if loc.provider_id}
        
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
                try:
                    await new_loc.save()
                    final_results.append(new_loc)
                    existing_ids.add(ext_id)
                except Exception as e:
                    # Likely DuplicateKeyError race condition
                    print(f"DEBUG: Race condition handling for {ext_id}: {e}")
                    # Try to fetch it again
                    existing = await Location.find_one({"provider_id": ext_id})
                    if existing:
                        final_results.append(existing)
                        existing_ids.add(ext_id)
        
        print(f"DEBUG: Final results: {[l.name for l in final_results]}")
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

    async def get_global_videos_feed(self, current_user_id: str, limit: int = 20, offset: int = 0) -> List[Post]:
        """
        Retrieves all video posts globally using aggregation for efficient filtering.
        """
        # 1. Get Blocked IDs
        blocked_records = await UserBlocks.find({
            "$or": [
                {"blocker_id": current_user_id},
                {"blocked_id": current_user_id}
            ]
        }).to_list()
        
        excluded_user_ids = {current_user_id}
        excluded_user_ids.update(r.blocker_id for r in blocked_records)
        excluded_user_ids.update(r.blocked_id for r in blocked_records)

        # 2. Aggregation Pipeline to find Posts that HAVE video media
        pipeline = [
            # Filter out blocked authors
            {"$match": {"owner_id": {"$nin": list(excluded_user_ids)}}},
            
            # Lookup media to check file_type
            # detailed info: Beanie stores Link as DBRef usually, but we need to check how it is stored.
            # Assuming standard reference or list of IDs. 
            # If Beanie uses simple links, $lookup works on the ID list.
            {
                "$lookup": {
                    "from": "media",
                    "localField": "media.id", # Try standard beanie relational field
                    "foreignField": "_id",
                    "as": "media_docs"
                }
            },
            
            # Filter for video content
            {"$match": {"media_docs.file_type": "video"}},
            
            # Randomize (User wants a "modern" random feed)
            {"$sample": {"size": limit}} 
        ]
        
        # Execute Aggregation
        # We only need the _id to fetch the full document with links afterwards
        # This is safer than converting aggregation result back to Beanie Document manually
        aggregation_result = await Post.find_many({}).aggregate(pipeline).to_list()
        
        found_ids = [doc["_id"] for doc in aggregation_result]
        
        if not found_ids:
            return []

        # 3. Fetch full documents conformant with the rest of the app (relations loaded)
        posts = await Post.find(
            {"_id": {"$in": found_ids}},
            fetch_links=True
        ).to_list()
        
        # Since $sample order is lost in the $in query, we shuffle again to ensure random order
        random.shuffle(posts)
        
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

    async def _fetch_radar_locations(self, query: str, limit: int, lat: Optional[float] = None, lng: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Hybrid Search:
        1. Autocomplete (Addresses/Cities)
        2. Places Search (POIs like 'Shoprite') if lat/lng is provided or we default to a central location.
        """
        async with httpx.AsyncClient() as client:
            # Task 1: Autocomplete (Best for cities/addresses)
            autocomplete_url = "https://api.radar.io/v1/search/autocomplete"
            headers = {"Authorization": f"{settings.RADAR_SECRET_KEY}"}
            ac_params = {
                "query": query,
                "limit": limit,
                "layers": "place,address" # exclude 'poi' here if we use places endpoint, or keep it.
            }
            if lat and lng:
                ac_params["near"] = f"{lat},{lng}"

            # Task 2: Places Search (Best for POIs)
            # We need categories to search effectively. We'll include broad top-level categories.
            # See Radar categories: https://radar.com/documentation/places/categories
            places_url = "https://api.radar.io/v1/search/places"
            places_params = {
                "query": query, # Text match on place name
                "limit": limit,
                "categories": "shopping-retail,food-beverage,entertainment-nightlife,travel-transportation",
                "radius": 10000 # 10km radius
            }
            if lat and lng:
                places_params["near"] = f"{lat},{lng}"
            else:
                # If no user location, bias to Nigeria (Lagos approx center for broad search)
                # Or skip places search if strictly requires location? Radar allows basic search maybe.
                # Let's try to bias to Lagos if no coords provided, to fix the 'default US' issue.
                places_params["near"] = "6.5244,3.3792" 

            tasks = [
                client.get(autocomplete_url, params=ac_params, headers=headers),
                client.get(places_url, params=places_params, headers=headers)
            ]
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process Results
            merged_results = []
            seen_ids = set()

            # Helper to parse standard place object
            def parse_place(item, is_autocomplete=False):
                pid = item.get("placeId") or item.get("_id") or item.get("id")
                
                # Check duplication
                if not pid or pid in seen_ids:
                    return None
                
                name = item.get("placeLabel") or item.get("name") or item.get("addressLabel")
                
                # Address handling
                if is_autocomplete:
                    raw_addr = item.get("formattedAddress", "")
                else:
                    # Places API returns address components differently usually
                    # But often has 'address' field? Let's check keys or construct.
                    # Fallback to simple construction
                    loc = item.get("location", {})
                    raw_addr = loc.get("address") or item.get("formattedAddress") or ""
                    if not raw_addr:
                         # Construct from components if available
                         raw_addr = ", ".join(filter(None, [
                             loc.get("address"), item.get("city"), item.get("state"), item.get("country")
                         ]))

                # Clean address logic
                if not raw_addr or "undefined" in raw_addr.lower():
                     raw_addr = name # Fallback
                
                # Coords
                if is_autocomplete:
                    c_lat = item.get("latitude")
                    c_lng = item.get("longitude")
                else:
                    geo = item.get("location", {}).get("coordinates", [])
                    c_lng = geo[0] if len(geo) > 1 else None
                    c_lat = geo[1] if len(geo) > 1 else None

                if c_lat is None or c_lng is None:
                    return None
                
                if not pid:
                     pid = f"radar:{c_lat},{c_lng}"

                seen_ids.add(pid)
                return {
                    "provider_id": pid,
                    "name": name,
                    "full_address": raw_addr,
                    "coordinates": {"lat": c_lat, "lng": c_lng}
                }

            # 1. Parse Places Response (High priority for POIs)
            if isinstance(responses[1], httpx.Response) and responses[1].status_code == 200:
                p_data = responses[1].json()
                for p in p_data.get("places", []):
                    parsed = parse_place(p, is_autocomplete=False)
                    if parsed: merged_results.append(parsed)

            # 2. Parse Autocomplete Response (High priority for Geocoding)
            if isinstance(responses[0], httpx.Response) and responses[0].status_code == 200:
                a_data = responses[0].json()
                for a in a_data.get("addresses", []):
                    parsed = parse_place(a, is_autocomplete=True)
                    if parsed: merged_results.append(parsed)
            
            return merged_results

    async def _fetch_radar_reverse(self, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        url = "https://api.radar.io/v1/geocode/reverse"
        headers = {"Authorization": settings.RADAR_SECRET_KEY}
        params = {"coordinates": f"{lat},{lng}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("addresses"):
                        addr = data["addresses"][0]
                        # Best effort name
                        name = addr.get("placeLabel") or addr.get("addressLabel") or addr.get("formattedAddress")
                        return {
                            "name": name,
                            "address": addr.get("formattedAddress"),
                            "city": addr.get("city"),
                            "state": addr.get("state"),
                            "country": addr.get("country")
                        }
            except Exception as e:
                print(f"Radar Reverse Geocode Error: {e}")
        return None

    async def create_custom_location(self, name: str, address: Optional[str], city: Optional[str], state: Optional[str], country: Optional[str], lat: Optional[float] = None, lng: Optional[float] = None) -> Location:
        # Construct Address
        parts = [city, state, country]
        full_address = address or ", ".join([p for p in parts if p])
        
        # Create
        pid = f"user:{PydanticObjectId()}"
        loc_data = {
            "name": name,
            "location": {"type": "Point", "coordinates": [lng or 0.0, lat or 0.0]}, # Default to 0,0 if no coords
            "provider_id": pid,
            "provider": "user",
            "address": full_address
        }
        
        new_loc = Location(**loc_data)
        await new_loc.save()
        return new_loc

    async def get_posts_by_location(self, location_id: str, limit: int = 20, offset: int = 0) -> List[Post]:
        # 1. Verify Location
        location = await Location.get(PydanticObjectId(location_id))
        if not location:
            return []
        
        # 2. Find Posts
        # Note: We query the 'location.id' field or the link. 
        # Beanie models link objects, so we can query on the reference or use aggregate.
        # Simple match:
        posts = await Post.find(Post.location.id == PydanticObjectId(location_id), fetch_links=True).sort("-created_at").skip(offset).limit(limit).to_list()
        
        return posts