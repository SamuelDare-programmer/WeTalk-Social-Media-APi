from fastapi import APIRouter, status, Depends
# Import your schemas (Pydantic models)
from .schemas import UploadRequest, UploadResponse, CreatePostRequest, PostResponse
# Import your new Services
from .services import MediaService, PostService
from app.core.auth.dependencies import get_current_user


router = APIRouter(prefix="/posts", tags=["posts"])

async def get_test_user():
    user_id = "6942a0f705abd2a972494f60"
    return user_id

@router.post("/media/request-upload", response_model=UploadResponse)
async def request_upload_endpoint(req: UploadRequest, current_user=Depends(get_test_user)):
    """
    Endpoint for Phase A: Get upload URL.
    """
    # TODO: Get actual user from auth dependency
    current_user_id = current_user
    
    # 1. Instantiate Service
    media_service = MediaService()
    
    # 2. Delegate Logic
    result = await media_service.initiate_upload(
        user_id=current_user_id,
        filename=req.filename,
        file_type=req.file_type,
        size_bytes=req.size_bytes
    )
    
    return result

@router.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_post_endpoint(req: CreatePostRequest):
    """
    Endpoint for Phase C: Confirm upload and create post.
    """
    current_user_id = "user_123"
    
    # 1. Instantiate Service
    post_service = PostService()
    
    # 2. Delegate Logic
    new_post = await post_service.create_post(
        user_id=current_user_id,
        caption=req.caption,
        internal_media_id=req.internal_media_id
    )
    
    return {
        "message": "Post created successfully",
        "post_id": str(new_post.id),
        "media_status": "active"
    }