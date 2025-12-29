from typing import Optional
from datetime import datetime
import uuid

from beanie import Document
from pydantic import Field
from pymongo import IndexModel

class PostLike(Document):
    post_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "post_likes"
        indexes = [
            IndexModel(
                [("post_id", 1), ("user_id", 1)],
                unique=True
            )
        ]

class Comment(Document):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, alias="_id")
    post_id: str
    user_id: str
    parent_id: Optional[uuid.UUID] = None
    content: str = Field(..., max_length=2200)
    reply_count: int = 0
    like_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_deleted: bool = False

    class Settings:
        name = "comments"
        indexes = [
            [("post_id", 1), ("created_at", -1)],
            [("parent_id", 1)]
        ]

class Bookmark(Document):
    user_id: str
    post_id: str
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "bookmarks"
        indexes = [
            IndexModel(
                [("user_id", 1), ("post_id", 1)],
                unique=True
            )
        ]

class CommentLike(Document):
    comment_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "comment_likes"
        indexes = [
            IndexModel(
                [("comment_id", 1), ("user_id", 1)],
                unique=True
            )
        ]