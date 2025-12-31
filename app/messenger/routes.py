from typing import List
from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect

from app.core.auth.dependencies import get_current_user, get_current_user_ws
from app.core.db.models import User
from app.messenger.schemas import StartConversationRequest, SendMessageRequest, ConversationResponse, MessageResponse
from app.messenger.service import MessengerService, manager

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
    
    # Quick fix to return formatted response (re-using get_inbox logic basically)
    # Ideally service returns the schema
    return ConversationResponse(
        _id=str(conv.id),
        participants=[], # Todo: fill
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
