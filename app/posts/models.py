from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum

from beanie import Document, Link
from pydantic import BaseModel, Field
from app.discovery.models import Location

# --- Enums ---

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"

class MediaStatus(str, Enum):
    PENDING = "PENDING"   # Created in DB, waiting for upload
    ACTIVE = "ACTIVE"     # Successfully uploaded and public
    FAILED = "FAILED"     # Upload failed

# --- Database Models ---

class Media(Document):
    """
    Represents a media file (Image/Video).
    Tracks the lifecycle from local intent -> Google Drive Upload.
    """
    owner_id: str 
    status: MediaStatus = MediaStatus.PENDING

    file_type: MediaType          # Enum: "image" or "video"
    filename: str
    media_type: str               # MIME type, e.g., "image/png"
    
    # The Google Drive File ID (Important for deletions/management)
    public_id: str
    
    # Public View Link (What the frontend displays)
    view_link: str
    # # Direct Download Link (Good for certain <video> tags)
    # download_link: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "media"


# # Optional: Embedded model for Location to be extensible later
# class LocationData(BaseModel):
#     name: str
#     lat: Optional[float] = None
#     lng: Optional[float] = None


class Post(Document):
    owner_id: str
    caption: Optional[str] = Field(None, max_length=2200)
    tags: List[str] = []
    location: Optional[Link[Location]] = None
    
    # List of media items (Good for carousels)
    media: List[Link[Media]] = [] 
    
    # Counters for fast feed generation
    likes_count: int = 0
    comments_count: int = 0
    share_count: int = 0
    original_post: Optional[Link["Post"]] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "posts"
        # Index for chronological feed fetching
        indexes = [
            [("created_at", -1)],
            [("owner_id", 1), ("created_at", -1)]
        ]