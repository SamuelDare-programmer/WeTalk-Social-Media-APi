from fastapi import APIRouter, Depends, status, Query
from typing import List
from app.core.auth.dependencies import get_current_user
from app.core.db.models import User
from app.engagement.service import EngagementService
from app.engagement.schemas import CommentCreate, CommentTreeResponse, SharePostRequest
from app.posts.schemas import PostResponse

router = APIRouter(prefix="/posts", tags=["engagement"])

@router.post("/{post_id}/likes", status_code=status.HTTP_200_OK)
async def like_post_endpoint(
    post_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Like a post. Idempotent operation.
    """
    service = EngagementService()
    result = await service.like_post(user_id=str(current_user.id), post_id=post_id)
    return result

@router.delete("/{post_id}/likes", status_code=status.HTTP_200_OK)
async def unlike_post_endpoint(
    post_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Unlike a post. Idempotent operation.
    """
    service = EngagementService()
    result = await service.unlike_post(user_id=str(current_user.id), post_id=post_id)
    return result

@router.post("/{post_id}/comments", status_code=status.HTTP_201_CREATED, response_model=CommentTreeResponse)
async def create_comment_endpoint(
    post_id: str,
    body: CommentCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Add a comment to a post. Supports one level of nesting (replies).
    """
    service = EngagementService()
    result = await service.add_comment(user_id=str(current_user.id), post_id=post_id, content=body.content, parent_id=body.parent_id)
    return result

@router.delete("/comments/{comment_id}", status_code=status.HTTP_200_OK)
async def delete_comment_endpoint(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a comment. Performs a soft delete if the comment has replies.
    """
    service = EngagementService()
    result = await service.delete_comment(user_id=str(current_user.id), comment_id=comment_id)
    return result

@router.get("/{post_id}/comments", status_code=status.HTTP_200_OK, response_model=List[CommentTreeResponse])
async def get_comments_endpoint(
    post_id: str,
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get comments for a post. Returns top-level comments with a preview of up to 3 replies.
    """
    service = EngagementService()
    result = await service.get_comments(post_id=post_id, limit=limit, offset=offset, user_id=str(current_user.id))
    return result

@router.post("/comments/{comment_id}/likes", status_code=status.HTTP_200_OK)
async def like_comment_endpoint(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Like a comment. Idempotent.
    """
    service = EngagementService()
    result = await service.like_comment(user_id=str(current_user.id), comment_id=comment_id)
    return result

@router.delete("/comments/{comment_id}/likes", status_code=status.HTTP_200_OK)
async def unlike_comment_endpoint(
    comment_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Unlike a comment. Idempotent.
    """
    service = EngagementService()
    result = await service.unlike_comment(user_id=str(current_user.id), comment_id=comment_id)
    return result

@router.post("/{post_id}/bookmark", status_code=status.HTTP_200_OK)
async def bookmark_post_endpoint(
    post_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Bookmark a post. Idempotent.
    """
    service = EngagementService()
    result = await service.bookmark_post(user_id=str(current_user.id), post_id=post_id)
    return result

@router.delete("/{post_id}/bookmark", status_code=status.HTTP_200_OK)
async def unbookmark_post_endpoint(
    post_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Remove a bookmark from a post. Idempotent.
    """
    service = EngagementService()
    result = await service.unbookmark_post(user_id=str(current_user.id), post_id=post_id)
    return result

@router.get("/bookmarks", status_code=status.HTTP_200_OK, response_model=List[PostResponse])
async def get_user_bookmarks_endpoint(
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get the current user's bookmarked posts.
    """
    service = EngagementService()
    result = await service.get_user_bookmarks(user_id=str(current_user.id), limit=limit, offset=offset)
    return result

@router.post("/{post_id}/share", status_code=status.HTTP_201_CREATED, response_model=PostResponse)
async def share_post_endpoint(
    post_id: str,
    body: SharePostRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Share (Repost) a post. Creates a new post referencing the original.
    """
    service = EngagementService()
    new_post = await service.share_post(
        user_id=str(current_user.id), 
        post_id=post_id, 
        caption=body.caption,
        tags=body.tags,
        location_id=body.location_id
    )
    
    # Helper to map a Post document to PostResponse
    def map_post(p):
        return {
            "_id": str(p.id),
            "owner_id": p.owner_id,
            "caption": p.caption,
            "media": [
                {
                    "media_id": str(m.id),
                    "view_link": m.view_link,
                    "media_type": m.media_type
                } for m in p.media
            ] if p.media else [],
            "likes_count": p.likes_count,
            "comments_count": p.comments_count,
            "share_count": p.share_count,
            "created_at": p.created_at,
            # Dynamic fields (defaults for new post)
            "is_bookmarked": False,
            "is_liked": False,
            "original_post": map_post(p.original_post) if p.original_post else None,
            "location": p.location
        }

    return map_post(new_post)