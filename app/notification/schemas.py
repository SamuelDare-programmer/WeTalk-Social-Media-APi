from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from .models import NotificationType

class NotificationActor(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    type: NotificationType
    actor: NotificationActor
    target_id: Optional[str] = None
    metadata: Dict[str, Any]
    is_read: bool
    created_at: datetime

class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
