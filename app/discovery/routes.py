from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Union, Any, Optional
from pydantic import BaseModel
from app.discovery.service import DiscoveryService
from app.discovery.schemas import HashtagResponse, LocationResponse, UserSearchResponse
from app.posts.schemas import PostResponse
from app.core.auth.dependencies import get_current_user
from app.core.db.models import User
from app.engagement.service import EngagementService
from app.core.auth.schemas import UserPublicModel
from beanie import PydanticObjectId
from beanie.operators import In
import asyncio

router = APIRouter(prefix="/discovery", tags=["discovery"])

@router.get("/search", response_model=List[Union[UserSearchResponse, HashtagResponse, LocationResponse]])
async def search(
    q: str,
    type: str = Query(..., pattern="^(user|tag|place)$"),
    limit: int = Query(20, le=50),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Universal Search Endpoint.
    """
    service = DiscoveryService()
    
    if type == "user":
        return await service.search_users(q, str(current_user.id), limit)
    elif type == "tag":
        return await service.search_hashtags(q, limit)
    elif type == "place":
        return await service.search_locations(q, limit, lat, lng)
    
    return []

@router.get("/suggestions", response_model=List[dict])
async def get_suggestions(
    limit: int = 3,
    current_user: User = Depends(get_current_user)
):
    """
    Get suggested users based on follower count.
    """
    service = DiscoveryService()
    return await service.get_suggested_users(str(current_user.id), limit)

@router.get("/trending", response_model=List[HashtagResponse])
async def get_trending_hashtags(limit: int = Query(10, le=50)):
    service = DiscoveryService()
    hashtags = await service.get_trending_hashtags(limit)
    return [
        HashtagResponse(
            id=str(tag.id),
            name=tag.name,
            post_count=tag.post_count
        ) for tag in hashtags
    ]

@router.get("/places/{location_id}", response_model=List[PostResponse])
async def get_posts_by_location(
    location_id: str,
    limit: int = Query(20, le=50),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    service = DiscoveryService()
    engagement_service = EngagementService()
    
    posts = await service.get_posts_by_location(location_id, limit, offset)
    
    if not posts:
        return []

    # Fetch authors
    owner_ids = list({PydanticObjectId(post.owner_id) for post in posts})
    users = await User.find(In(User.id, owner_ids)).to_list()
    user_map = {str(u.id): u for u in users}
    
    def get_author_model(owner_id):
        user = user_map.get(owner_id)
        return UserPublicModel(**user.model_dump()) if user else None

    # Fetch engagement status
    post_ids = [str(p.id) for p in posts]
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), post_ids),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), post_ids)
    )
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)

    return [
        PostResponse(
            id=str(post.id),
            owner_id=post.owner_id,
            author=get_author_model(post.owner_id),
            caption=post.caption,
            media=[
                {
                    "media_id": str(media.id),
                    "view_link": media.view_link,
                    "media_type": media.media_type
                } for media in post.media
            ],
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            share_count=post.share_count,
            created_at=post.created_at,
            location=post.location,
            is_liked=str(post.id) in liked_set,
            is_bookmarked=str(post.id) in bookmarked_set
        ) for post in posts
    ]

@router.get("/tags/{tag_name}", response_model=List[PostResponse])
async def get_posts_by_tag(
    tag_name: str,
    limit: int = Query(20, le=50),
    offset: int = 0,
    type: Optional[str] = Query(None, pattern="^(image|video)$"),
    current_user: User = Depends(get_current_user)
):
    service = DiscoveryService()
    engagement_service = EngagementService()
    
    posts = await service.get_posts_by_hashtag(tag_name, limit, offset, media_type=type)
    
    if not posts:
        return []

    # Fetch authors
    owner_ids = list({PydanticObjectId(post.owner_id) for post in posts if PydanticObjectId.is_valid(post.owner_id)})
    users = await User.find(In(User.id, owner_ids)).to_list()
    user_map = {str(u.id): u for u in users}
    
    def get_author_model(owner_id):
        user = user_map.get(owner_id)
        return UserPublicModel(**user.model_dump()) if user else None

    # Fetch engagement status
    post_ids = [str(p.id) for p in posts]
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), post_ids),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), post_ids)
    )
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)

    return [
        PostResponse(
            id=str(post.id),
            owner_id=post.owner_id,
            author=get_author_model(post.owner_id),
            caption=post.caption,
            media=[
                {
                    "media_id": str(media.id),
                    "view_link": media.view_link,
                    "media_type": media.media_type or (f"video/mp4" if media.file_type == "video" else "image/jpeg")
                } for media in post.media
            ] if post.media else [],
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            share_count=post.share_count,
            created_at=post.created_at,
            location=post.location,
            is_liked=str(post.id) in liked_set,
            is_bookmarked=str(post.id) in bookmarked_set
        ) for post in posts
    ]

@router.get("/geocode/reverse")
async def reverse_geocode(lat: float, lng: float):
    service = DiscoveryService()
    result = await service._fetch_radar_reverse(lat, lng)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result

class CustomLocationRequest(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@router.post("/places/custom", response_model=LocationResponse)
async def create_custom_place(payload: CustomLocationRequest, current_user: User = Depends(get_current_user)):
    service = DiscoveryService()
    loc = await service.create_custom_location(
        name=payload.name,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        lat=payload.latitude,
        lng=payload.longitude
    )
    return loc

@router.get("/explore", response_model=List[PostResponse])
async def get_explore_feed(
    limit: int = Query(20, le=50),
    offset: int = 0,
    type: Optional[str] = Query(None, pattern="^(image|video)$"),
    current_user: User = Depends(get_current_user)
):
    """
    Explore Feed: Discover engaging content from users you don't follow.
    """
    service = DiscoveryService()
    engagement_service = EngagementService()
    
    posts = await service.get_explore_feed(str(current_user.id), limit, offset, media_type=type)
    
    if not posts:
        return []
    # Fetch authors
    owner_ids = list({PydanticObjectId(post.owner_id) for post in posts if PydanticObjectId.is_valid(post.owner_id)})
    users = await User.find(In(User.id, owner_ids)).to_list()
    user_map = {str(u.id): u for u in users}
    
    def get_author_model(owner_id):
        user = user_map.get(owner_id)
        return UserPublicModel(**user.model_dump()) if user else None

    # Fetch engagement status
    post_ids = [str(p.id) for p in posts]
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), post_ids),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), post_ids)
    )
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)
    return [
        PostResponse(
            id=str(post.id),
            owner_id=post.owner_id,
            author=get_author_model(post.owner_id),
            caption=post.caption,
            media=[
                {
                    "media_id": str(media.id),
                    "view_link": media.view_link,
                    "media_type": media.media_type or (f"video/mp4" if media.file_type == "video" else "image/jpeg")
                } for media in post.media
            ] if post.media else [],
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            share_count=post.share_count,
            created_at=post.created_at,
            location=post.location,
            is_liked=str(post.id) in liked_set,
            is_bookmarked=str(post.id) in bookmarked_set
        ) for post in posts
    ]
    return results