from datetime import datetime
from typing import List, Optional
from beanie import PydanticObjectId
from .models import Notification, NotificationType
from app.core.db.models import User

class NotificationService:
    async def create_notification(
        self, 
        recipient_id: str, 
        actor_id: str, 
        type: NotificationType, 
        target_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        if recipient_id == actor_id:
            return  # Don't notify yourself

        notification = Notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            type=type,
            target_id=target_id,
            metadata=metadata or {}
        )
        await notification.save()
        return notification

    async def get_user_notifications(self, user_id: str, limit: int = 20, offset: int = 0):
        notifications = await Notification.find(
            Notification.recipient_id == user_id
        ).sort("-created_at").skip(offset).limit(limit).to_list()

        unread_count = await Notification.find(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).count()

        # Enrich with actor data
        actor_ids = list(set(n.actor_id for n in notifications))
        actors = await User.find({"_id": {"$in": [PydanticObjectId(aid) for aid in actor_ids]}}).to_list()
        actor_map = {str(a.id): a for a in actors}

        enriched_items = []
        for n in notifications:
            actor = actor_map.get(n.actor_id)
            enriched_items.append({
                "id": str(n.id),
                "type": n.type,
                "actor": {
                    "id": n.actor_id,
                    "username": actor.username if actor else "deleted_user",
                    "avatar_url": actor.avatar_url if actor else None
                },
                "target_id": n.target_id,
                "metadata": n.metadata,
                "is_read": n.is_read,
                "created_at": n.created_at
            })

        return {
            "items": enriched_items,
            "unread_count": unread_count
        }

    async def mark_as_read(self, notification_id: str, user_id: str):
        notification = await Notification.find_one(
            Notification.id == PydanticObjectId(notification_id),
            Notification.recipient_id == user_id
        )
        if notification:
            notification.is_read = True
            await notification.save()
        return notification

    async def mark_all_as_read(self, user_id: str):
        await Notification.find(
            Notification.recipient_id == user_id,
            Notification.is_read == False
        ).update({"$set": {"is_read": True}})
