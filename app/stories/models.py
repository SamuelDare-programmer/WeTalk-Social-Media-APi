from typing import List, Optional
from datetime import datetime, timezone
from beanie import Document, Link
from pydantic import Field
from pymongo import IndexModel, ASCENDING

from app.posts.models import Media

class Story(Document):
    owner_id: str
    media: Link[Media]
    caption: Optional[str] = Field(None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    
    # View counter (denormalized for performance)
    views_count: int = 0

    class Settings:
        name = "stories"
        indexes = [
            # Important: TTL Index to auto-delete expired stories
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
            IndexModel([("owner_id", ASCENDING), ("created_at", -1)])
        ]

class StoryView(Document):
    """
    Tracks who viewed which story to prevent duplicate views
    and allow "seen by" lists.
    """
    story_id: str
    viewer_id: str
    viewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "story_views"
        indexes = [
            # Compound index to ensure 1 view per user per story
            IndexModel([("story_id", ASCENDING), ("viewer_id", ASCENDING)]), 
            # TTL: Auto-clean after 48 hours
            IndexModel([("viewed_at", ASCENDING)], expireAfterSeconds=172800)
        ]
