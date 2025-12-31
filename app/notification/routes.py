from fastapi import APIRouter, Depends, Query, status
from typing import List
from app.core.auth.dependencies import get_current_user
from app.core.db.models import User
from .service import NotificationService
from .schemas import NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])
service = NotificationService()

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    limit: int = Query(20, le=50),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    return await service.get_user_notifications(str(current_user.id), limit, offset)

@router.patch("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    await service.mark_as_read(notification_id, str(current_user.id))
    return {"message": "Notification marked as read"}

@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_read(
    current_user: User = Depends(get_current_user)
):
    await service.mark_all_as_read(str(current_user.id))
    return {"message": "All notifications marked as read"}
