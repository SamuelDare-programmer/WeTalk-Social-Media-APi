from fastapi import HTTPException
from beanie import PydanticObjectId
from app.core.db.models import User, UserFollows, UserBlocks, FollowStatus
from datetime import datetime
from typing import List, Dict, Any
from app.core.services.celery_worker import send_email
from app.core.config import settings

class FollowService:
    async def follow_user(self, follower_id: str, target_user_id: str):
        """
        Creates a following relationship with privacy, block, and idempotency checks.
        """
        # 1. Self-Check
        if follower_id == target_user_id:
            raise HTTPException(status_code=400, detail="You cannot follow yourself.")

        # 2. Block Check
        # Check if a block exists in either direction (follower -> target OR target -> follower)
        block_exists = await UserBlocks.find_one({
            "$or": [
                {"blocker_id": follower_id, "blocked_id": target_user_id},
                {"blocker_id": target_user_id, "blocked_id": follower_id}
            ]
        })
        
        if block_exists:
            raise HTTPException(status_code=403, detail="Action forbidden.")

        # 3. Idempotency
        existing_follow = await UserFollows.find_one({
            "follower_id": follower_id,
            "following_id": target_user_id
        })
        
        if existing_follow:
            return {
                "status": "success",
                "relationship_status": existing_follow.status
            }

        # 4. Privacy Logic
        target_user = await User.get(PydanticObjectId(target_user_id))
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found.")

        follower = await User.get(PydanticObjectId(follower_id))
        if not follower:
            raise HTTPException(status_code=404, detail="Follower not found.")

        if target_user.is_private:
            status = FollowStatus.PENDING
            # Trigger "Follow Request" Notification event
            send_email.delay(
                recipients=[target_user.email],
                subject="New Follow Request",
                template_body={
                    "username": target_user.first_name,
                    "follower_username": follower.username,
                    "follower_name": f"{follower.first_name} {follower.last_name}",
                    "action_url": f"{settings.DOMAIN_NAME}/users/requests"
                },
                template_name="follow_request.html"
            )
        else:
            status = FollowStatus.ACTIVE
            # Trigger "New Follower" Notification event
            send_email.delay(
                recipients=[target_user.email],
                subject="You have a new follower!",
                template_body={
                    "username": target_user.first_name,
                    "follower_username": follower.username,
                    "follower_name": f"{follower.first_name} {follower.last_name}",
                    "profile_url": f"{settings.DOMAIN_NAME}/users/{follower.username}"
                },
                template_name="new_follower.html"
            )
            
            # Increment follower count for target
            await target_user.inc({User.followers_count: 1})
            
            # Increment following count for follower
            await follower.inc({User.following_count: 1})

        # Create the relationship
        new_follow = UserFollows(
            follower_id=follower_id,
            following_id=target_user_id,
            status=status
        )
        await new_follow.save()

        return {
            "status": "success",
            "relationship_status": status
        }

    async def _remove_relationship(self, follower_id: str, following_id: str) -> bool:
        """
        Internal helper to remove a follow relationship and update counts.
        Returns True if a record was deleted, False otherwise.
        """
        follow_record = await UserFollows.find_one({
            "follower_id": follower_id,
            "following_id": following_id
        })

        if not follow_record:
            return False

        # Decrement counts strictly if the status was active
        if follow_record.status == FollowStatus.ACTIVE:
            target_user = await User.get(PydanticObjectId(following_id))
            if target_user:
                await target_user.inc({User.followers_count: -1})
            
            follower = await User.get(PydanticObjectId(follower_id))
            if follower:
                await follower.inc({User.following_count: -1})

        await follow_record.delete()
        return True

    async def unfollow_user(self, follower_id: str, target_user_id: str):
        """
        Removes a following relationship.
        """
        removed = await self._remove_relationship(follower_id, target_user_id)

        if not removed:
            raise HTTPException(status_code=404, detail="Relationship not found.")

        return {
            "status": "success",
            "message": "Unfollowed successfully"
        }

    async def block_user(self, blocker_id: str, blocked_id: str):
        """
        Blocks a user and performs destructive cleanup of relationships.
        """
        if blocker_id == blocked_id:
            raise HTTPException(status_code=400, detail="You cannot block yourself.")

        # 1. Idempotency Check
        existing_block = await UserBlocks.find_one({
            "blocker_id": blocker_id,
            "blocked_id": blocked_id
        })
        
        if existing_block:
            return {"status": "success", "message": "User already blocked."}

        # 2. Create Block Entry
        new_block = UserBlocks(blocker_id=blocker_id, blocked_id=blocked_id)
        await new_block.save()

        # 3. Destructive Cleanup: Unfollow blocker -> blocked
        await self._remove_relationship(blocker_id, blocked_id)

        # 4. Destructive Cleanup: Force unfollow blocked -> blocker
        await self._remove_relationship(blocked_id, blocker_id)

        # 5. Cache Invalidation
        # TODO: Clear any cached feeds for current_user (blocker) that might contain blocked_id's content.
        # e.g., await redis.delete(f"feed:{blocker_id}")

        return {"status": "success", "message": "User blocked successfully."}

    async def respond_to_follow_request(self, target_user_id: str, follower_id: str, action: str):
        """
        Accepts or Declines a pending follow request.
        target_user_id: The user receiving the request (current_user).
        follower_id: The user who sent the request.
        action: 'accept' or 'decline'
        """
        # 1. Verify request exists
        follow_record = await UserFollows.find_one({
            "follower_id": follower_id,
            "following_id": target_user_id
        })

        if not follow_record:
            raise HTTPException(status_code=404, detail="Follow request not found.")

        if follow_record.status != FollowStatus.PENDING:
            raise HTTPException(status_code=400, detail="This request is not pending.")

        if action == "accept":
            follow_record.status = FollowStatus.ACTIVE
            await follow_record.save()

            # Increment counts
            target_user = await User.get(PydanticObjectId(target_user_id))
            if target_user:
                await target_user.inc({User.followers_count: 1})
            
            follower = await User.get(PydanticObjectId(follower_id))
            if follower:
                await follower.inc({User.following_count: 1})
            
            return {"status": "success", "relationship_status": "active"}

        elif action == "decline":
            await follow_record.delete()
            return {"status": "success", "relationship_status": "none"}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use 'accept' or 'decline'.")

    async def check_follow_status(self, follower_id: str, target_user_id: str) -> str:
        record = await UserFollows.find_one({
            "follower_id": follower_id,
            "following_id": target_user_id
        })
        return record.status.value if record else "none"

    async def _can_view_follows(self, target_user_id: str, current_user_id: str) -> bool:
        """
        Checks if current_user is allowed to view target_user's follows.
        """
        if target_user_id == current_user_id:
            return True
            
        target_user = await User.get(PydanticObjectId(target_user_id))
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found.")
            
        if not target_user.is_private:
            return True
            
        # If private, check if current_user follows target_user
        is_following = await UserFollows.find_one({
            "follower_id": current_user_id,
            "following_id": target_user_id,
            "status": FollowStatus.ACTIVE
        })
        
        return bool(is_following)

    async def _enrich_user_list(self, user_ids: List[str], current_user_id: str) -> List[Dict[str, Any]]:
        """
        Fetches user details and adds 'is_following_viewer' context.
        """
        # 1. Fetch Users
        users = await User.find({"_id": {"$in": [PydanticObjectId(uid) for uid in user_ids]}}).to_list()
        user_map = {str(u.id): u for u in users}

        # 2. "Follows You" Context: Check if these users follow the viewer
        follows_viewer_records = await UserFollows.find({
            "follower_id": {"$in": user_ids},
            "following_id": current_user_id,
            "status": FollowStatus.ACTIVE
        }).to_list()
        
        follows_viewer_set = {r.follower_id for r in follows_viewer_records}

        # 3. Construct Result
        results = []
        for uid in user_ids:
            user = user_map.get(uid)
            if user:
                results.append({
                    "id": str(user.id),
                    "username": user.username,
                    "full_name": f"{user.first_name} {user.last_name}".strip(),
                    "avatar_url": user.avatar_url,
                    "is_following_viewer": uid in follows_viewer_set
                })
        return results

    async def get_followers(self, target_user_id: str, current_user_id: str, limit: int = 20, cursor: str = None):
        if not await self._can_view_follows(target_user_id, current_user_id):
            raise HTTPException(status_code=403, detail="This account is private.")

        query = {"following_id": target_user_id, "status": FollowStatus.ACTIVE}
        if cursor:
            query["created_at"] = {"$lt": datetime.fromisoformat(cursor)}

        # Fetch limit + 1 to determine if there is a next page
        records = await UserFollows.find(query).sort("-created_at").limit(limit + 1).to_list()
        
        next_cursor = None
        if len(records) > limit:
            next_cursor = records[limit - 1].created_at.isoformat()
            records = records[:limit]

        follower_ids = [r.follower_id for r in records]
        items = await self._enrich_user_list(follower_ids, current_user_id)
        
        return {"items": items, "next_cursor": next_cursor}

    async def get_following(self, target_user_id: str, current_user_id: str, limit: int = 20, cursor: str = None):
        if not await self._can_view_follows(target_user_id, current_user_id):
            raise HTTPException(status_code=403, detail="This account is private.")

        query = {"follower_id": target_user_id, "status": FollowStatus.ACTIVE}
        if cursor:
            query["created_at"] = {"$lt": datetime.fromisoformat(cursor)}

        records = await UserFollows.find(query).sort("-created_at").limit(limit + 1).to_list()
        
        next_cursor = None
        if len(records) > limit:
            next_cursor = records[limit - 1].created_at.isoformat()
            records = records[:limit]

        following_ids = [r.following_id for r in records]
        items = await self._enrich_user_list(following_ids, current_user_id)
        
        return {"items": items, "next_cursor": next_cursor}

    async def get_pending_requests(self, current_user_id: str, limit: int = 20, cursor: str = None):
        """
        Retrieves pending follow requests for the current user.
        """
        query = {"following_id": current_user_id, "status": FollowStatus.PENDING}
        if cursor:
            query["created_at"] = {"$lt": datetime.fromisoformat(cursor)}

        records = await UserFollows.find(query).sort("-created_at").limit(limit + 1).to_list()
        
        next_cursor = None
        if len(records) > limit:
            next_cursor = records[limit - 1].created_at.isoformat()
            records = records[:limit]

        follower_ids = [r.follower_id for r in records]
        items = await self._enrich_user_list(follower_ids, current_user_id)
        
        return {"items": items, "next_cursor": next_cursor}
