from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from app.core.auth.dependencies import get_current_user
from .service import FollowService
from app.core.db.models import User
from app.following.schemas import (
    FollowListResponse, 
    FollowRequestAction, 
    RelationshipResponse, 
    ActionResponse
)

# # Placeholder for auth dependency
# async def get_current_user():
#     return "6942a0f705abd2a972494f60"

from app.core.auth.service import UserService
from app.core.auth.schemas import UserPublicModel
from fastapi import APIRouter, Depends, Query, status, HTTPException

router = APIRouter(prefix="/users", tags=["following"])

@router.get("/{identifier}", response_model=UserPublicModel)
async def get_user_profile(identifier: str):
    """
    Fetch a user's public profile by ID or username.
    """
    service = UserService()
    # Attempt to fetch by PydanticObjectId (ID) first if it looks like one, otherwise username
    user = None
    try:
        from beanie import PydanticObjectId
        user = await service.get_user_by_id(identifier)
    except:
        pass
    
    if not user:
        user = await service.get_user(identifier)
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

@router.get("/{user_id}/followers", response_model=FollowListResponse)
async def get_followers(
    user_id: str,
    limit: int = Query(20, le=100),
    cursor: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get a list of users following the target user_id.
    """
    service = FollowService()
    result = await service.get_followers(user_id, str(current_user.id), limit, cursor)
    return result

@router.get("/{user_id}/following", response_model=FollowListResponse)
async def get_following(
    user_id: str,
    limit: int = Query(20, le=100),
    cursor: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get a list of users that the target user_id follows.
    """
    service = FollowService()
    result = await service.get_following(user_id, str(current_user.id), limit, cursor)
    return result

@router.post("/{user_id}/block", status_code=status.HTTP_200_OK, response_model=ActionResponse)
async def block_user_endpoint(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Block a user. Removes all follow relationships between the two users.
    """
    service = FollowService()
    result = await service.block_user(str(current_user.id), user_id)
    return result

@router.post("/{user_id}/follow", status_code=status.HTTP_200_OK, response_model=RelationshipResponse)
async def follow_user_endpoint(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Follow a user.
    """
    service = FollowService()
    result = await service.follow_user(follower_id=str(current_user.id), target_user_id=user_id)
    return result

@router.delete("/{user_id}/follow", status_code=status.HTTP_200_OK, response_model=ActionResponse)
async def unfollow_user_endpoint(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Unfollow a user.
    """
    service = FollowService()
    result = await service.unfollow_user(follower_id=str(current_user.id), target_user_id=user_id)
    return result

@router.get("/requests/pending", response_model=FollowListResponse)
async def get_pending_requests(
    limit: int = Query(20, le=100),
    cursor: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get a list of pending follow requests for the current user.
    """
    service = FollowService()
    result = await service.get_pending_requests(str(current_user.id), limit, cursor)
    return result

@router.post("/requests/{follower_id}/action", status_code=status.HTTP_200_OK, response_model=RelationshipResponse)
async def respond_to_follow_request(
    follower_id: str,
    req: FollowRequestAction,
    current_user: User = Depends(get_current_user)
):
    """
    Accept or Decline a follow request from a specific user.
    """
    service = FollowService()
    # current_user is the one receiving the request (target), follower_id is the requester
    result = await service.respond_to_follow_request(target_user_id=str(current_user.id), follower_id=follower_id, action=req.action)
    return result