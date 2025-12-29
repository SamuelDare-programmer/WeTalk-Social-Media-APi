from fastapi import APIRouter, Query, Depends
from typing import List
from app.posts.models import Post
from app.posts.schemas import PostResponse
from app.core.auth.dependencies import get_current_user
from app.core.db.models import User, UserFollows, FollowStatus
from app.engagement.service import EngagementService
import asyncio

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("/timeline", response_model=List[PostResponse])
async def get_timeline(
    limit: int = Query(10, le=50), 
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get the personalized timeline (posts from users the current user follows).
    """
    # 1. Get list of users I follow
    following_records = await UserFollows.find(
        UserFollows.follower_id == str(current_user.id),
        UserFollows.status == FollowStatus.ACTIVE
    ).to_list()
    
    following_ids = [r.following_id for r in following_records]
    # Include own posts in timeline
    following_ids.append(str(current_user.id))

    # 2. Fetch Posts
    posts = await Post.find(
        {"owner_id": {"$in": following_ids}},
        fetch_links=True
    ).sort(-Post.created_at).skip(offset).limit(limit).to_list()

    # 3. Hydrate (Likes/Bookmarks)
    engagement_service = EngagementService()
    
    post_ids = [str(p.id) for p in posts]
    original_ids = [str(p.original_post.id) for p in posts if p.original_post]
    all_ids_to_check = list(set(post_ids + original_ids))
    
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), all_ids_to_check),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), all_ids_to_check)
    )
    
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)

    def map_post(p):
        return PostResponse(
            id=str(p.id),
            owner_id=p.owner_id,
            caption=p.caption,
            media=[{"media_id": str(m.id), "view_link": m.view_link, "media_type": m.media_type} for m in p.media] if p.media else [],
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            share_count=p.share_count,
            created_at=p.created_at,
            is_liked=str(p.id) in liked_set,
            is_bookmarked=str(p.id) in bookmarked_set,
            original_post=map_post(p.original_post) if p.original_post else None,
            location=p.location
        )

    return [map_post(p) for p in posts]
