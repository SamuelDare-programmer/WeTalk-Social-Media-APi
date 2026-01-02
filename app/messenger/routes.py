from typing import List
from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect

from app.core.auth.dependencies import get_current_user, get_current_user_ws
from app.core.db.models import User
from app.messenger.schemas import StartConversationRequest, SendMessageRequest, ConversationResponse, MessageResponse
from app.messenger.service import MessengerService, manager
from beanie import PydanticObjectId
from beanie.operators import In

router = APIRouter(prefix="/conversations", tags=["Messenger"])

# --- REST Endpoints ---

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    req: StartConversationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Start a new chat (1-on-1 or Group).
    If 1-on-1 exists, returns existing conversation.
    """
    # Note: Service returns raw DB model, we might need to map it to Response schema properly
    # For now, let's rely on Pydantic's magic or fetch the inbox version
    conv = await MessengerService.start_conversation(str(current_user.id), req)
    
    # Populate participants
    other_ids = [pid for pid in conv.participants if pid != str(current_user.id)]
    p_ids = []
    for pid in other_ids:
        try:
            p_ids.append(PydanticObjectId(pid))
        except:
            continue
            
    users = await User.find(In(User.id, p_ids)).to_list()
    display_participants = [{"user_id": str(u.id), "username": u.username, "avatar_url": u.avatar_url} for u in users]

    return ConversationResponse(
        _id=str(conv.id),
        participants=display_participants,
        last_message=conv.last_message_preview,
        last_message_at=conv.last_message_at,
        is_group=conv.is_group,
        group_name=conv.group_name
    )

@router.get("/", response_model=List[ConversationResponse])
async def get_inbox(
    current_user: User = Depends(get_current_user)
):
    """
    Get all conversations for the current user.
    """
    return await MessengerService.get_inbox(str(current_user.id))

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_chat_history(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get message history for a conversation.
    """
    return await MessengerService.get_messages(conversation_id, str(current_user.id))

@router.post("/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Send a message via REST (triggers WebSocket broadcast).
    """
    await MessengerService.send_message(str(current_user.id), conversation_id, req)
    return {"status": "sent"}

@router.patch("/{conversation_id}/pin")
async def toggle_pin(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Toggle pin status for a conversation.
    """
    is_pinned = await MessengerService.toggle_pin(str(current_user.id), conversation_id)
    return {"is_pinned": is_pinned}

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a conversation. If all participants delete it, the data is wiped.
    """
    await MessengerService.delete_conversation(str(current_user.id), conversation_id)

@router.delete("/{conversation_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    conversation_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific message.
    """
    await MessengerService.delete_message(str(current_user.id), message_id)

# --- WebSocket Endpoint ---

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    Real-time connection for internal messaging.
    Authenticate via query param `token`.
    """
    try:
        user = await get_current_user_ws(token)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        await manager.connect(str(user.id), websocket)
        try:
            while True:
                # Keep alive loop
                # We can also handle incoming WS messages here if we want 
                # fully bidirectional WS instead of REST + WS-Notify
                data = await websocket.receive_text()
                # Echo or process (Optional)
        except WebSocketDisconnect:
            manager.disconnect(str(user.id), websocket)
            
    except Exception:
        # Token invalid or other error
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
