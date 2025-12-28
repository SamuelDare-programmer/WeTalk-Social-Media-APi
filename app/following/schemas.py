from pydantic import BaseModel, Field
from typing import List, Optional

class UserListSchema(BaseModel):
    id: str
    username: str
    full_name: str
    avatar_url: Optional[str] = None
    is_following_viewer: bool

class FollowListResponse(BaseModel):
    items: List[UserListSchema]
    next_cursor: Optional[str] = None

class FollowRequestAction(BaseModel):
    action: str = Field(..., pattern="^(accept|decline)$", description="Action to perform: 'accept' or 'decline'")

class RelationshipResponse(BaseModel):
    status: str
    relationship_status: str

class ActionResponse(BaseModel):
    status: str
    message: str