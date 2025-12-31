from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Union, Any, Optional
from app.discovery.service import DiscoveryService
from app.discovery.schemas import HashtagResponse, LocationResponse, UserSearchResponse
from app.posts.schemas import PostResponse
from app.core.auth.dependencies import get_current_user
from app.core.db.models import User

router = APIRouter(prefix="/discovery", tags=["discovery"])

@router.get("/search", response_model=List[Union[UserSearchResponse, HashtagResponse, LocationResponse]])
async def search(
    q: str,
    type: str = Query(..., pattern="^(user|tag|place)$"),
    limit: int = Query(20, le=50),
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
        return await service.search_locations(q, limit)
    
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

@router.get("/tags/{tag_name}", response_model=List[PostResponse])
async def get_posts_by_tag(
    tag_name: str,
    limit: int = Query(20, le=50),
    offset: int = 0,
    type: Optional[str] = Query(None, pattern="^(image|video)$")
):
    service = DiscoveryService()
    posts = await service.get_posts_by_hashtag(tag_name, limit, offset, media_type=type)
    
    # Basic mapping to PostResponse
    results = []
    for p in posts:
        results.append(PostResponse(
            id=str(p.id),
            owner_id=p.owner_id,
            caption=p.caption,
            media=[
                {
                    "media_id": str(m.id),
                    "view_link": m.view_link,
                    "media_type": m.media_type or (f"video/mp4" if m.file_type == "video" else "image/jpeg")
                } for m in p.media
            ] if p.media else [],
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            share_count=p.share_count,
            created_at=p.created_at,
            # Note: is_liked/is_bookmarked are False here as we aren't passing current_user context yet
            # To fix, we would inject EngagementService logic here similar to feed/routes.py
            location=p.location
        ))
    return results

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
    posts = await service.get_explore_feed(str(current_user.id), limit, offset, media_type=type)
    
    # Map to PostResponse
    results = []
    for p in posts:
        results.append(PostResponse(
            id=str(p.id),
            owner_id=p.owner_id,
            caption=p.caption,
            media=[
                {
                    "media_id": str(m.id),
                    "view_link": m.view_link,
                    "media_type": m.media_type or (f"video/mp4" if m.file_type == "video" else "image/jpeg")
                } for m in p.media
            ] if p.media else [],
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            share_count=p.share_count,
            created_at=p.created_at,
            location=p.location
        ))
    return results