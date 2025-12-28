from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from beanie import Document, Indexed, Link, PydanticObjectId
from datetime import datetime




class User(Document):
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
    is_private: bool = False
    followers_count: int = 0
    following_count: int = 0

    class Settings:
        name = "users"

class FollowStatus(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"

class UserFollows(Document):
    follower_id: str
    following_id: str
    status: FollowStatus = FollowStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "user_follows"
        indexes = [
            [("follower_id", 1), ("following_id", 1)],
        ]

class UserBlocks(Document):
    blocker_id: str
    blocked_id: str
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "user_blocks"
        indexes = [
            [("blocker_id", 1), ("blocked_id", 1)],
        ]

# class PostModel(Document):

#     user: Link["User"]
#     image_url: Optional[str] = None
#     caption: Optional[str] = None
#     created_at: datetime = Field(default_factory=datetime.now)
#     likes: int = 0
#     class Settings:
#         name = "posts"
