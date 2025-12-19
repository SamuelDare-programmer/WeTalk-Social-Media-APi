from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from beanie import Document, Indexed, Link, PydanticObjectId
from datetime import datetime
from enum import Enum



class UserModel(Document):
    username: str = Indexed(unique=True)
    email: EmailStr = Indexed(unique=True)
    password_hash: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    is_verified: bool = False

    class Settings:
        name = "users"


class PostModel(Document):
    user: Link["UserModel"]
    image_url: Optional[str] = None
    caption: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    likes: int = 0
    class Settings:
        name = "posts"



# --- Enums ---

class MediaType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"

class MediaStatus(str, Enum):
    PENDING = "PENDING"   # Created in DB, waiting for client to upload to Tusky
    ACTIVE = "ACTIVE"     # Confirmed uploaded and verified on Tusky/Walrus
    FAILED = "FAILED"     # Upload failed or verification failed

# --- Database Models ---

class Media(Document):
    """
    Represents a media file (Image/Video).
    Tracks the lifecycle from local intent -> Tusky Upload -> Walrus Blob.
    """
    owner_id: str
    status: MediaStatus = MediaStatus.PENDING
    file_type: MediaType
    
    # The ID assigned by the Tusky.io API (used for management/verification)
    tusky_file_id: Optional[str] = None
    
    # The permanent blob ID on the Walrus Network (once active)
    walrus_blob_id: Optional[str] = None
    
    # The URL the client used to upload (stored for debugging/resuming)
    upload_url: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "media"

class Post(Document):
    """
    Represents a User Post that contains a caption and linked Media.
    """
    caption: str
    owner_id: str
    
    # A Post can have multiple media items. 
    # We use Beanie's Link type to reference the Media documents.
    media: List[Link[Media]] = []
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "posts"