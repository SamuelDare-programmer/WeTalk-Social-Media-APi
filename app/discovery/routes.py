from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Union, Any
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

@router.get("/trending", response_model=List[HashtagResponse])
async def get_trending_hashtags(limit: int = Query(10, le=50)):
    service = DiscoveryService()
    return await service.get_trending_hashtags(limit)

@router.get("/tags/{tag_name}", response_model=List[PostResponse])
async def get_posts_by_tag(tag_name: str, limit: int = Query(20, le=50), offset: int = 0):
    service = DiscoveryService()
    posts = await service.get_posts_by_hashtag(tag_name, limit, offset)
    
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
                    "media_type": m.media_type
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