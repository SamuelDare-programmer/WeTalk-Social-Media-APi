from typing import List, Optional
from datetime import datetime
from beanie import Document, Link
from pydantic import Field
from app.posts.models import Media

class Conversation(Document):
    # List of User IDs in this chat
    participants: List[str] 
    
    # Metadata
    is_group: bool = False
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    
    last_message_at: datetime = Field(default_factory=datetime.now)
    last_message_preview: Optional[str] = None

    # Users who have pinned this conversation
    pinned_by: List[str] = []

    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "conversations"
        indexes = [
            [("participants", 1), ("last_message_at", -1)]
        ]

class Message(Document):
    conversation_id: str
    sender_id: str
    
    content: Optional[str] = None
    media: Optional[Link[Media]] = None
    
    # Read receipts (simplistic: list of user_ids who saw it)
    read_by: List[str] = []
    
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "messages"
        indexes = [
            [("conversation_id", 1), ("created_at", 1)] # Ascending for chat log
        ]
