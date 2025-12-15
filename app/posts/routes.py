from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from typing import List

from app.core.db.models import PostModel
from app.posts.schemas import PostCreate, PostPublic
from app.core.auth.dependencies import get_current_user
from app.core.db.models import UserModel
from app.core.services.tusky import TuskyClient
from app.core.config import settings

# Initialize Service
# Ensure settings.TUSKY_API_KEY is set in your config!
tusky_service = TuskyClient(api_key=settings.TUSKY_API_KEY)

router = APIRouter(prefix="/posts", tags=["posts"])

# --- 1. UPLOAD IMAGE (Tusky) ---
@router.post("/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user)
):
    # Validate Image
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only images allowed")
    
    file_content = await file.read()
    
    # Send to Decentralized Storage
    try:
        public_url = await tusky_service.upload_file(
            file_content, 
            file.filename, 
            file.content_type
        )
        return {"url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. CREATE POST (DB) ---
@router.post("/", response_model=PostPublic, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    current_user: UserModel = Depends(get_current_user)
):
    # Create the DB Object
    new_post = PostModel(
        user=current_user, # Link the current user
        caption=post_in.caption,
        image_url=post_in.image_url
    )
    await new_post.create()
    
    # Beanie Tip: 'new_post.user' is just a Link right now. 
    # To return the full 'PostPublic' schema, we should populate the user data manually
    # or rely on the frontend to know the user.
    # For now, let's just return the structure matching PostPublic:
    return PostPublic(
        _id=new_post.id,
        caption=new_post.caption,
        image_url=new_post.image_url,
        likes=new_post.likes,
        created_at=new_post.created_at,
        user=current_user # Pass the full user object here
    )

# --- 3. GET FEED ---
@router.get("/", response_model=List[PostPublic])
async def get_feed(limit: int = 10, skip: int = 0):
    # Fetch posts, sort by newest (-created_at)
    posts = await PostModel.find_all().sort("-created_at").limit(limit).skip(skip).to_list()
    
    results = []
    for post in posts:
        # Beanie Fetch Link: We need to fetch the user data for each post
        # This is the "N+1" problem. In production, we would use aggregation.
        # For now, we will fetch strictly.
        await post.fetch_link(PostModel.user)
        
        results.append(post)
        
    return results