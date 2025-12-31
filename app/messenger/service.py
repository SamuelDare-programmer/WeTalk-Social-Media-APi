from datetime import datetime
from typing import List, Dict
from fastapi import WebSocket

from app.messenger.models import Conversation, Message
from app.messenger.schemas import StartConversationRequest, SendMessageRequest, ConversationResponse, MessageResponse
from app.posts.models import Media
from app.core.db.models import User
from app.core.errors import ConversationNotFoundException, ContentValidationException
from beanie.operators import In, And

class ConnectionManager:
    """
    Manages active WebSocket connections.
    In-memory implementation (Single Instance).
    For scaling, use Redis Pub/Sub.
    """
    def __init__(self):
        # Map: user_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            # Broadcast to all active sessions of this user
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Clean up dead connection if needed, or rely on disconnect handler
                    pass

manager = ConnectionManager()

class MessengerService:
    @staticmethod
    async def start_conversation(user_id: str, req: StartConversationRequest) -> Conversation:
        participants = sorted(list(set(req.participant_ids + [user_id])))
        if len(participants) < 2:
             raise ContentValidationException("Conversation needs at least 2 participants")

        # Check existing 1-on-1
        if len(participants) == 2 and not req.group_name:
             existing = await Conversation.find_one(
                 Conversation.participants == participants,
                 Conversation.is_group == False
             )
             if existing:
                 return existing

        # Create New
        conv = Conversation(
            participants=participants,
            is_group=(len(participants) > 2 or bool(req.group_name)),
            group_name=req.group_name
        )
        await conv.insert()
        return conv

    @staticmethod
    async def get_inbox(user_id: str) -> List[ConversationResponse]:
        conversations = await Conversation.find(
            In(Conversation.participants, [user_id])
        ).sort("-last_message_at").to_list()
        
        # Populate Participant Details
        all_participant_ids = set()
        for c in conversations:
            all_participant_ids.update(c.participants)
            
        users = await User.find(In(User.id, list(all_participant_ids))).to_list()
        user_map = {str(u.id): u for u in users}
        
        results = []
        for c in conversations:
            # Format participants for display (exclude self unless it's just self)
            display_participants = []
            for pid in c.participants:
                if pid == user_id and len(c.participants) > 1:
                    continue
                u = user_map.get(pid)
                if u:
                    display_participants.append({
                        "user_id": str(u.id),
                        "username": u.username,
                        "avatar_url": u.profile_image
                    })
            
            results.append(ConversationResponse(
                _id=str(c.id),
                participants=display_participants,
                last_message=c.last_message_preview,
                last_message_at=c.last_message_at,
                is_group=c.is_group,
                group_name=c.group_name,
                is_pinned=(user_id in (c.pinned_by or []))
            ))
            
        # Final sort: Pinned first, then by last message time
        results.sort(key=lambda x: (x.is_pinned, x.last_message_at), reverse=True)
            
        return results

    @staticmethod
    async def toggle_pin(user_id: str, conversation_id: str) -> bool:
        conv = await Conversation.get(conversation_id)
        if not conv or user_id not in conv.participants:
            raise ConversationNotFoundException("Conversation not found")
        
        if conv.pinned_by is None:
            conv.pinned_by = []
            
        if user_id in conv.pinned_by:
            conv.pinned_by.remove(user_id)
            is_pinned = False
        else:
            conv.pinned_by.append(user_id)
            is_pinned = True
            
        await conv.save()
        return is_pinned

    @staticmethod
    async def send_message(user_id: str, conversation_id: str, req: SendMessageRequest):
        conv = await Conversation.get(conversation_id)
        if not conv or user_id not in conv.participants:
            raise ConversationNotFoundException("Conversation not found")

        media_link = None
        if req.media_id:
             media_item = await Media.get(req.media_id)
             if media_item:
                 media_link = media_item.to_ref() # Or Just link

        msg = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=req.content,
            media=media_link,
            read_by=[user_id]
        )
        await msg.insert()
        
        # Update Conversation
        conv.last_message_at = msg.created_at
        conv.last_message_preview = req.content if req.content else "[Media]"
        await conv.save()

        # Real-time Broadcast
        payload = {
            "type": "new_message",
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "content": req.content,
            "created_at": msg.created_at.isoformat()
        }
        
        for pid in conv.participants:
            await manager.send_personal_message(payload, pid)
            
        return msg

    @staticmethod
    async def get_messages(conversation_id: str, user_id: str, limit: int = 50) -> List[MessageResponse]:
        conv = await Conversation.get(conversation_id)
        if not conv or user_id not in conv.participants:
            raise ConversationNotFoundException("Conversation not found")
            
        messages = await Message.find(
            Message.conversation_id == conversation_id
        ).sort("-created_at").limit(limit).to_list()
        
        # Reverse to show chronological order in UI
        messages.reverse()
        
        results = []
        for m in messages:
            media_url = None
            if m.media:
                 # Fetch media details if needed, or assume Link works
                 # In Beanie, Link needs fetch, or we store URL denormalized
                 # For MVP, let's assume no media or we fetch it
                 # Optimization: Store media_url in Message or fetch in bulk
                 pass

            results.append(MessageResponse(
                _id=str(m.id),
                conversation_id=m.conversation_id,
                sender_id=m.sender_id,
                content=m.content,
                media_url=None, # Todo: handle media fetch
                created_at=m.created_at,
                is_me=(m.sender_id == user_id)
            ))
        return results
