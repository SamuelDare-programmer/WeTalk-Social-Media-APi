from typing import List
from fastapi import APIRouter, Depends, status

from app.core.auth.dependencies import get_current_user
from app.core.db.models import User
from app.stories.schemas import CreateStoryRequest, StoryFeedItem, StoryResponse
from app.stories.service import StoryService

router = APIRouter(prefix="/stories", tags=["Stories"])

@router.post("/", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    req: CreateStoryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Upload a new story (Image/Video).
    Requires a valid media_id from a previous upload.
    """
    story = await StoryService.create_story(str(current_user.id), req)
    
    # Manually map to response since the service returns DB model
    # Ideally, we add a helper for this or make the service return the Pydantic model
    media_item = story.media
    if hasattr(media_item, "fetch"):
        media_item = await media_item.fetch()
        
    if not media_item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Media associated with story not found")

    return StoryResponse(
        id=str(story.id),
        owner_id=story.owner_id,
        media_url=media_item.view_link,
        media_type=media_item.file_type,
        caption=story.caption,
        created_at=story.created_at,
        expires_at=story.expires_at,
        views_count=story.views_count,
        viewed=False
    )

@router.get("/feed", response_model=List[StoryFeedItem])
async def get_stories_feed(
    current_user: User = Depends(get_current_user)
):
    """
    Get the tray of active stories from followed users and yourself.
    """
    return await StoryService.get_stories_feed(str(current_user.id))

@router.post("/{story_id}/view", status_code=status.HTTP_200_OK)
async def mark_story_viewed(
    story_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Mark a story as 'seen'. Safe to call multiple times.
    """
    await StoryService.record_view(story_id, str(current_user.id))
    return {"status": "ok"}

@router.get("/{story_id}/viewers", response_model=List[dict])
async def get_story_viewers(
    story_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    See who viewed your story. Only the owner can call this.
    """
    return await StoryService.get_story_viewers(story_id, str(current_user.id))

@router.post("/{story_id}/react", status_code=status.HTTP_200_OK)
async def react_to_story(
    story_id: str,
    emoji: str,
    current_user: User = Depends(get_current_user)
):
    """
    Send an emoji reaction to a story.
    """
    await StoryService.add_reaction(story_id, str(current_user.id), emoji)
    return {"status": "ok"}

@router.get("/{story_id}/reactions", response_model=List[dict])
async def get_story_reactions(
    story_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    See reactions to your story. Only the owner can call this.
    """
    return await StoryService.get_story_reactions(story_id, str(current_user.id))

