from fastapi import HTTPException
from app.posts.schemas import CreatePostRequest
from .models import Media, Post, MediaStatus
from beanie import PydanticObjectId

class PostService:
    async def create_post(self, user_id: str, req: CreatePostRequest) -> Post:
        media_objects = []
        for media_id in req.media_ids:
            media = await Media.get(PydanticObjectId(media_id))
            if not media or media.owner_id != user_id:
                raise HTTPException(status_code=400, detail=f"Invalid media_id: {media_id}")
            if media.status != MediaStatus.ACTIVE:
                raise HTTPException(status_code=400, detail=f"Media is not ready: {media_id}")
            media_objects.append(media)

        new_post = Post(
            owner_id=user_id,
            caption=req.caption,
            tags=req.tags,
            media=media_objects,
        )
        
        await new_post.save()
        return new_post

    async def get_post(self, post_id: str) -> Post:
        post = await Post.get(PydanticObjectId(post_id), fetch_links=True)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        return post

    async def get_all_posts(self, limit: int = 10, offset: int = 0) -> list[Post]:
        return (
            await Post.find_all(fetch_links=True)
            .sort(-Post.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def delete_post(self, post_id: str, user_id: str):
        post = await Post.get(PydanticObjectId(post_id))
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        if post.owner_id != user_id:
            raise HTTPException(status_code=403, detail="You are not authorized to delete this post")
            
        await post.delete()

    async def update_post(self, post_id: str, user_id: str, req: CreatePostRequest) -> Post:
        post = await Post.get(PydanticObjectId(post_id), fetch_links=True)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        if post.owner_id != user_id:
            raise HTTPException(status_code=403, detail="You are not authorized to update this post")

        media_objects = []
        for media_id in req.media_ids:
            media = await Media.get(PydanticObjectId(media_id))
            if not media or media.owner_id != user_id:
                raise HTTPException(status_code=400, detail=f"Invalid media_id: {media_id}")
            if media.status != MediaStatus.ACTIVE:
                raise HTTPException(status_code=400, detail=f"Media is not ready: {media_id}")
            media_objects.append(media)

        post.caption = req.caption
        post.tags = req.tags
        post.media = media_objects
        
        await post.save()
        return post
    