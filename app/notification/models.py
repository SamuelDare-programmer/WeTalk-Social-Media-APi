from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any
from beanie import Document, Indexed
from pydantic import Field

class NotificationType(str, Enum):
    FOLLOW = "follow"
    FOLLOW_REQUEST = "follow_request"
    LIKE = "like"
    COMMENT = "comment"
    MENTION = "mention"
    MESSAGE = "message"

class Notification(Document):
    recipient_id: Indexed(str)
    actor_id: str
    type: NotificationType
    target_id: Optional[str] = None  # ID of post, comment, or message
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "notifications"
        indexes = [
            [("recipient_id", 1), ("created_at", -1)],
        ]
