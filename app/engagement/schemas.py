from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid
from app.core.auth.schemas import UserPublicModel

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2200)
    parent_id: Optional[str] = None

class SharePostRequest(BaseModel):
    caption: Optional[str] = Field(None, max_length=2200)
    tags: List[str] = []
    location_id: Optional[str] = None

class UserInteraction(BaseModel):
    has_liked: bool = False
    is_author: bool = False

class CommentResponse(BaseModel):
    id: uuid.UUID = Field(alias="_id")
    post_id: str
    user_id: str
    content: str
    created_at: datetime
    like_count: int = 0
    reply_count: int = 0
    parent_id: Optional[uuid.UUID] = None
    user_interaction: Optional[UserInteraction] = None
    author: Optional[UserPublicModel] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        from_attributes=True
    )

class CommentTreeResponse(CommentResponse):
    latest_replies: List[CommentResponse] = []