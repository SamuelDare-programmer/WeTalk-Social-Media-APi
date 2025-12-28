from fastapi import APIRouter, Query
from typing import List
from app.posts.models import Post
from app.posts.schemas import (
    PostResponse,
)  # You need a response schema that matches the Model

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("/timeline", response_model=List[PostResponse])
async def get_timeline(limit: int = Query(10, le=50), offset: int = 0):
    # TODO: In future, filter by "users I follow"
    # For now: Global chronological feed (Public Timeline)

    posts = (
        await Post.find_all(fetch_links=True)
        .sort(-Post.created_at)
        .skip(offset)
        .limit(limit)
        .to_list()
    )  # <--- You MUST have this to get the data # <--- CRITICAL: Fetches the image/video data joined to the post
    return posts
