from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.discovery.schemas import LocationResponse



# ==========================================
# 1. Media Schemas
# ==========================================

class MediaResponse(BaseModel):
    """
    Returned after a successful file upload.
    Frontend uses 'media_id' to create the post.
    """
    media_id: str
    view_link: str  # The public Google Drive view link
    media_type: Optional[str] = None # e.g. "image/jpeg"

class ImageUploadResponse(BaseModel):
    message: str
    media_id: str
    public_id: str
    view_link: str

class VideoUploadResponse(BaseModel):
    message: str
    media_id: str

# ==========================================
# 2. Post Request Schemas (Client -> Server)
# ==========================================

class CreatePostRequest(BaseModel):
    """
    Payload to create a new post.
    Expects the ID returned from the upload endpoint.
    """
    caption: Optional[str] = Field(None, max_length=2200)
    media_ids: List[str] # We link the uploaded media by ID
    # location: Optional[LocationData] = None
    location_id: Optional[str] = None
    tags: List[str] = []

# ==========================================
# 3. Post Response Schemas (Server -> Client)
# ==========================================

class PostResponse(BaseModel):
    """
    Standard response when a post is created or retrieved.
    """
    id: str = Field(alias="_id")
    owner_id: str
    caption: Optional[str] = None
    
    # We return the full Media object (or at least the URL) so the frontend can render it
    media: List[MediaResponse] = [] 
    
    likes_count: int = 0
    comments_count: int = 0
    share_count: int = 0
    created_at: datetime
    is_bookmarked: bool = False
    is_liked: bool = False
    original_post: Optional["PostResponse"] = None
    location: Optional[LocationResponse] = None
    
    # Optional: If you want to expand the user details
    # owner: Optional[UserPublicModel] = None

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class PostCreateResponse(BaseModel):
    message: str = "Post created successfully"
    post_id: str