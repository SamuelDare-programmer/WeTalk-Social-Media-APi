from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- Responses ---

class StoryViewerResponse(BaseModel):
    user_id: str
    username: str
    avatar_url: Optional[str]
    viewed_at: datetime

class StoryResponse(BaseModel):
    id: str
    owner_id: str
    media_url: str
    media_type: str
    caption: Optional[str]
    created_at: datetime
    expires_at: datetime
    views_count: int
    
    # Optional: If the current user has viewed it
    viewed: bool = False

    model_config = ConfigDict(populate_by_name=True)

class StoryFeedItem(BaseModel):
    user_id: str
    username: str
    avatar_url: Optional[str]
    stories: List[StoryResponse]

# --- Requests ---

class CreateStoryRequest(BaseModel):
    media_id: str
    caption: Optional[str] = Field(None, max_length=500)
    # Default expiry is 24h, managed by backend, not frontend
