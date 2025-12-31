from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# --- Responses ---

class MessageResponse(BaseModel):
    id: str = Field(alias="_id")
    conversation_id: str
    sender_id: str
    content: Optional[str]
    media_url: Optional[str] = None
    created_at: datetime
    is_me: bool = False # Helper flag for frontend

class ConversationResponse(BaseModel):
    id: str = Field(alias="_id")
    participants: List[dict] # Simplified user objects
    last_message: Optional[str]
    last_message_at: datetime
    is_group: bool
    group_name: Optional[str]
    unread_count: int = 0
    is_pinned: bool = False

# --- Requests ---

class StartConversationRequest(BaseModel):
    participant_ids: List[str] # List of user_ids to start chat with
    group_name: Optional[str] = None

class SendMessageRequest(BaseModel):
    content: Optional[str] = None
    media_id: Optional[str] = None
    
    # At least one must be provided
    # Validator could be added here
