from fastapi import APIRouter, status, Depends, UploadFile, File, HTTPException, Query
from typing import List, Optional
import uuid
import shutil
import os
import asyncio
from beanie import PydanticObjectId
from beanie.operators import In
# Import Schemas
from .schemas import CreatePostRequest, PostResponse, ImageUploadResponse, VideoUploadResponse

# Import Services
from .services import PostService
from app.core.media.service import MediaService
from app.engagement.service import EngagementService
from app.core.db.models import User
from app.core.auth.schemas import UserPublicModel

# Import Auth
# Assuming you have a get_current_user dependency that returns the user's Pydantic model or ID
from app.core.auth.dependencies import get_current_user 

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/upload/image", status_code=status.HTTP_201_CREATED, response_model=ImageUploadResponse)
async def upload_image_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to upload an image file.
    Uploads immediately and returns media details.
    """
    media_service = MediaService()
    response = await media_service.upload_image(
        owner_id=str(current_user.id),
        file_content=await file.read(),
        filename=file.filename,
        content_type=file.content_type,
        public_id=str(uuid.uuid4())
    )
    return response

@router.post("/upload/video", status_code=status.HTTP_202_ACCEPTED, response_model=VideoUploadResponse)
async def upload_video_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to upload a video file.
    Queues the video processing task and returns a confirmation message.
    """
    # 1. Save file to temp disk storage
    temp_dir = ".temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    media_service = MediaService()
    response = await media_service.process_video_background(
        file_path=file_path,
        owner_id=str(current_user.id),
        filename=file.filename,
        content_type=file.content_type
    )
    return response

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PostResponse)
async def create_post_endpoint(
    req: CreatePostRequest,
    current_user: User = Depends(get_current_user)
) -> PostResponse:
    """
    Endpoint to create a new post.
    Validates media IDs and creates the post document.
    """
    post_service = PostService()
    new_post = await post_service.create_post(user_id=str(current_user.id), req=req)

    # Convert to PostResponse schema
    post_response = PostResponse(
        id=str(new_post.id),
        owner_id=new_post.owner_id,
        author=UserPublicModel(**current_user.model_dump()), # Optimization: Use the user object we already have
        caption=new_post.caption,
        media=[
            {
                "media_id": str(media.id),
                "view_link": media.view_link,
                "media_type": media.media_type
            } for media in new_post.media
        ],
        likes_count=new_post.likes_count,
        comments_count=new_post.comments_count,
        created_at=new_post.created_at,
        location=new_post.location
    )
    
    return post_response


@router.get("/medialist")
async def get_medialist():
    media_service = MediaService()

    media_list = await media_service.get_all_media()

    return media_list

@router.get("/media/user/{user_id}")
async def get_user_media(user_id: str):
    media_service = MediaService()
    return await media_service.get_user_media(user_id)

@router.get("/", response_model=List[PostResponse])
async def get_posts(
    limit: int = Query(10, le=50),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    post_service = PostService()
    engagement_service = EngagementService()
    posts = await post_service.get_all_posts(limit=limit, offset=offset)

    # Fetch authors for these posts to populate the 'author' field
    owner_ids = {PydanticObjectId(post.owner_id) for post in posts}
    
    # Also collect original post owner IDs
    for post in posts:
        if post.original_post and hasattr(post.original_post, "owner_id"):
             owner_ids.add(PydanticObjectId(post.original_post.owner_id))

    users = await User.find(In(User.id, list(owner_ids))).to_list()
    user_map = {str(u.id): u for u in users}
    
    # Helper to safely convert user to public model
    def get_author_model(owner_id):
        user = user_map.get(owner_id)
        return UserPublicModel(**user.model_dump()) if user else None

    # Fetch engagement status
    post_ids = [str(p.id) for p in posts] + [str(p.original_post.id) for p in posts if p.original_post and hasattr(p.original_post, "id")]
    
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), post_ids),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), post_ids)
    )
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)

    return [
        PostResponse(
            id=str(post.id),
            owner_id=post.owner_id,
            author=get_author_model(post.owner_id),
            caption=post.caption,
            media=[
                {
                    "media_id": str(media.id),
                    "view_link": media.view_link,
                    "media_type": media.media_type
                } for media in post.media
            ],
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            created_at=post.created_at,
            location=post.location,
            is_liked=str(post.id) in liked_set,
            is_bookmarked=str(post.id) in bookmarked_set,
            original_post=PostResponse(
                id=str(post.original_post.id),
                owner_id=post.original_post.owner_id,
                author=get_author_model(post.original_post.owner_id),
                caption=post.original_post.caption,
                media=[
                    {
                        "media_id": str(m.id),
                        "view_link": m.view_link,
                        "media_type": m.media_type
                    } for m in post.original_post.media
                ] if post.original_post.media else [],
                likes_count=post.original_post.likes_count,
                comments_count=post.original_post.comments_count,
                share_count=getattr(post.original_post, "share_count", 0),
                created_at=post.original_post.created_at,
                location=post.original_post.location,
                is_liked=str(post.original_post.id) in liked_set,
                is_bookmarked=str(post.original_post.id) in bookmarked_set
            ) if post.original_post and hasattr(post.original_post, "owner_id") else None
        ) for post in posts
    ]

@router.get("/user/{user_id}", response_model=List[PostResponse])
async def get_user_posts(
    user_id: str,
    limit: int = Query(10, le=50),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific user's posts (Profile Feed).
    Includes is_liked and is_bookmarked state for the current viewer.
    """
    post_service = PostService()
    engagement_service = EngagementService()
    
    posts = await post_service.get_user_posts(user_id, limit, offset)
    
    # Fetch the profile owner once
    target_user = await User.get(PydanticObjectId(user_id))

    # Collect IDs for batch fetching engagement status
    # We also check original_post IDs to properly show state on shared posts
    post_ids = [str(p.id) for p in posts]
    original_ids = [str(p.original_post.id) for p in posts if p.original_post]
    all_ids_to_check = list(set(post_ids + original_ids))
    
    # Parallel fetch of likes and bookmarks
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), all_ids_to_check),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), all_ids_to_check)
    )
    
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)
    
    def map_post(p, is_recursion=False):
        if not p:
            return None
        
        # If p is a Link and not fetched, we can't map it fully
        if hasattr(p, "to_ref") and not hasattr(p, "owner_id"):
            return None # Or handle differently
            
        return PostResponse(
            id=str(p.id),
            owner_id=p.owner_id,
            author=UserPublicModel(**target_user.model_dump()) if target_user and not is_recursion else None,
            caption=p.caption,
            media=[
                {
                    "media_id": str(m.id),
                    "view_link": m.view_link,
                    "media_type": m.media_type
                } for m in p.media if hasattr(m, "view_link")
            ] if p.media else [],
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            share_count=getattr(p, "share_count", 0),
            created_at=p.created_at,
            is_liked=str(p.id) in liked_set,
            is_bookmarked=str(p.id) in bookmarked_set,
            original_post=map_post(p.original_post, is_recursion=True) if p.original_post and not is_recursion else None,
            location=p.location
        )

    return [map_post(post) for post in posts]

@router.get("/user/{user_id}/likes", response_model=List[PostResponse])
async def get_user_liked_posts(
    user_id: str,
    limit: int = Query(10, le=50),
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get posts liked by a specific user.
    """
    post_service = PostService()
    engagement_service = EngagementService()
    
    posts = await post_service.get_liked_posts(user_id, limit, offset)
    
    if not posts:
        return []

    # Fetch authors
    owner_ids = {PydanticObjectId(post.owner_id) for post in posts}
    
    # Also collect original post owner IDs
    for post in posts:
        if post.original_post and hasattr(post.original_post, "owner_id"):
             owner_ids.add(PydanticObjectId(post.original_post.owner_id))

    users = await User.find(In(User.id, list(owner_ids))).to_list()
    user_map = {str(u.id): u for u in users}
    
    def get_author_model(owner_id):
        user = user_map.get(owner_id)
        return UserPublicModel(**user.model_dump()) if user else None

    # Fetch engagement status for current_user
    post_ids = [str(p.id) for p in posts] + [str(p.original_post.id) for p in posts if p.original_post and hasattr(p.original_post, "id")]
    liked_ids, bookmarked_ids = await asyncio.gather(
        engagement_service.get_liked_post_ids(str(current_user.id), post_ids),
        engagement_service.get_bookmarked_post_ids(str(current_user.id), post_ids)
    )
    liked_set = set(liked_ids)
    bookmarked_set = set(bookmarked_ids)

    return [
        PostResponse(
            id=str(post.id),
            owner_id=post.owner_id,
            author=get_author_model(post.owner_id),
            caption=post.caption,
            media=[
                {
                    "media_id": str(media.id),
                    "view_link": media.view_link,
                    "media_type": media.media_type
                } for media in post.media
            ],
            likes_count=post.likes_count,
            comments_count=post.comments_count,
            created_at=post.created_at,
            location=post.location,
            is_liked=str(post.id) in liked_set,
            is_bookmarked=str(post.id) in bookmarked_set,
            original_post=PostResponse(
                id=str(post.original_post.id),
                owner_id=post.original_post.owner_id,
                author=get_author_model(post.original_post.owner_id),
                caption=post.original_post.caption,
                media=[
                    {
                        "media_id": str(m.id),
                        "view_link": m.view_link,
                        "media_type": m.media_type
                    } for m in post.original_post.media
                ] if post.original_post.media else [],
                likes_count=post.original_post.likes_count,
                comments_count=post.original_post.comments_count,
                share_count=getattr(post.original_post, "share_count", 0),
                created_at=post.original_post.created_at,
                location=post.original_post.location,
                is_liked=str(post.original_post.id) in liked_set,
                is_bookmarked=str(post.original_post.id) in bookmarked_set
            ) if post.original_post and hasattr(post.original_post, "owner_id") else None
        ) for post in posts
    ]

# @router.post("/{post_id}/likes", status_code=status.HTTP_201_CREATED)
# async def like_post(
#     post_id: str,
#     current_user: User = Depends(get_current_user)
# ):
#     engagement_service = EngagementService()
#     await engagement_service.like_post(user_id=str(current_user.id), post_id=post_id)
#     return {"message": "Post liked"}

# @router.delete("/{post_id}/likes", status_code=status.HTTP_204_NO_CONTENT)
# async def unlike_post(
#     post_id: str,
#     current_user: User = Depends(get_current_user)
# ):
#     engagement_service = EngagementService()
#     await engagement_service.unlike_post(user_id=str(current_user.id), post_id=post_id)

@router.post("/{post_id}/share", status_code=status.HTTP_201_CREATED, response_model=PostResponse)
async def share_post(
    post_id: str,
    req: Optional[CreatePostRequest] = None,
    current_user: User = Depends(get_current_user)
):
    engagement_service = EngagementService()
    caption = req.caption if req else None
    tags = req.tags if req else []
    location_id = req.location_id if req else None
    
    new_post = await engagement_service.share_post(
        user_id=str(current_user.id),
        post_id=post_id,
        caption=caption,
        tags=tags,
        location_id=location_id
    )
    
    original_post_resp = None
    if new_post.original_post:
        op = new_post.original_post
        op_user = await User.get(PydanticObjectId(op.owner_id))
        original_post_resp = PostResponse(
            id=str(op.id),
            owner_id=op.owner_id,
            author=UserPublicModel(**op_user.model_dump()) if op_user else None,
            caption=op.caption,
            media=[
                {
                    "media_id": str(m.id),
                    "view_link": m.view_link,
                    "media_type": m.media_type
                } for m in op.media
            ] if op.media else [],
            likes_count=op.likes_count,
            comments_count=op.comments_count,
            share_count=getattr(op, "share_count", 0),
            created_at=op.created_at,
            location=op.location
        )

    return PostResponse(
        id=str(new_post.id),
        owner_id=new_post.owner_id,
        author=UserPublicModel(**current_user.model_dump()),
        caption=new_post.caption,
        media=[],
        likes_count=new_post.likes_count,
        comments_count=new_post.comments_count,
        share_count=new_post.share_count,
        created_at=new_post.created_at,
        location=new_post.location,
        original_post=original_post_resp
    )

@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str):
    post_service = PostService()
    post = await post_service.get_post(post_id)
    user = await User.get(PydanticObjectId(post.owner_id))
    
    original_post_resp = None
    if post.original_post and hasattr(post.original_post, "owner_id"):
        op = post.original_post
        op_user = await User.get(PydanticObjectId(op.owner_id))
        original_post_resp = PostResponse(
            id=str(op.id),
            owner_id=op.owner_id,
            author=UserPublicModel(**op_user.model_dump()) if op_user else None,
            caption=op.caption,
            media=[
                {
                    "media_id": str(m.id),
                    "view_link": m.view_link,
                    "media_type": m.media_type
                } for m in op.media
            ] if op.media else [],
            likes_count=op.likes_count,
            comments_count=op.comments_count,
            share_count=getattr(op, "share_count", 0),
            created_at=op.created_at,
            location=op.location
        )
    
    return PostResponse(
        id=str(post.id),
        owner_id=post.owner_id,
        author=UserPublicModel(**user.model_dump()) if user else None,
        caption=post.caption,
        media=[
            {
                "media_id": str(media.id),
                "view_link": media.view_link,
                "media_type": media.media_type
            } for media in post.media
        ],
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        created_at=post.created_at,
        location=post.location,
        original_post=original_post_resp
    )

@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_user)
):
    post_service = PostService()
    await post_service.delete_post(post_id, str(current_user.id))

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    req: CreatePostRequest,
    current_user: User = Depends(get_current_user)
):
    post_service = PostService()
    updated_post = await post_service.update_post(post_id, str(current_user.id), req)
    
    return PostResponse(
        id=str(updated_post.id),
        owner_id=updated_post.owner_id,
        author=UserPublicModel(**current_user.model_dump()), # Optimization: Use the user object we already have
        caption=updated_post.caption,
        media=[
            {
                "media_id": str(media.id),
                "view_link": media.view_link,
                "media_type": media.media_type
            } for media in updated_post.media
        ],
        likes_count=updated_post.likes_count,
        comments_count=updated_post.comments_count,
        created_at=updated_post.created_at,
        location=updated_post.location
    )
