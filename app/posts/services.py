from app.posts.schemas import CreatePostRequest
from .models import Media, Post, MediaStatus
from beanie import PydanticObjectId
from bson.errors import InvalidId
from app.core.errors import PostNotFoundException, MediaValidationException, UnauthorizedActionException, ContentValidationException
from app.discovery.models import Location
from app.discovery.service import DiscoveryService

class PostService:
    async def create_post(self, user_id: str, req: CreatePostRequest) -> Post:
        media_objects = []
        for media_id in req.media_ids:
            media = await Media.get(PydanticObjectId(media_id))
            if not media or media.owner_id != user_id:
                raise MediaValidationException(f"Invalid media_id: {media_id}")
            if media.status != MediaStatus.ACTIVE:
                raise MediaValidationException(f"Media is not ready: {media_id}")
            media_objects.append(media)

        location = None
        if req.location_id:
            location = await Location.get(PydanticObjectId(req.location_id))
            if not location:
                raise ContentValidationException(f"Invalid location_id: {req.location_id}")

        new_post = Post(
            owner_id=user_id,
            caption=req.caption,
            tags=req.tags,
            media=media_objects,
            location=location
        )
        
        await new_post.save()

        # Integrate Discovery: Process Hashtags
        if req.tags:
            discovery_service = DiscoveryService()
            await discovery_service.process_post_tags(str(new_post.id), req.tags)
            
        return new_post

    async def get_post(self, post_id: str) -> Post:
        try:
            post = await Post.get(PydanticObjectId(post_id), fetch_links=True)
        except InvalidId:
            raise PostNotFoundException()
            
        if not post:
            raise PostNotFoundException()
        return post

    async def get_all_posts(self, limit: int = 10, offset: int = 0) -> list[Post]:
        return (
            await Post.find_all(fetch_links=True)
            .sort(-Post.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def get_user_posts(self, user_id: str, limit: int = 10, offset: int = 0) -> list[Post]:
        return (
            await Post.find(Post.owner_id == user_id, fetch_links=True)
            .sort(-Post.created_at)
            .skip(offset)
            .limit(limit)
            .to_list()
        )

    async def delete_post(self, post_id: str, user_id: str):
        post = await Post.get(PydanticObjectId(post_id))
        if not post:
            raise PostNotFoundException()
        
        if post.owner_id != user_id:
            raise UnauthorizedActionException("You are not authorized to delete this post")
            
        await post.delete()

    async def update_post(self, post_id: str, user_id: str, req: CreatePostRequest) -> Post:
        post = await Post.get(PydanticObjectId(post_id), fetch_links=True)
        if not post:
            raise PostNotFoundException()
            
        if post.owner_id != user_id:
            raise UnauthorizedActionException("You are not authorized to update this post")

        media_objects = []
        for media_id in req.media_ids:
            media = await Media.get(PydanticObjectId(media_id))
            if not media or media.owner_id != user_id:
                raise MediaValidationException(f"Invalid media_id: {media_id}")
            if media.status != MediaStatus.ACTIVE:
                raise MediaValidationException(f"Media is not ready: {media_id}")
            media_objects.append(media)

        location = None
        if req.location_id:
            location = await Location.get(PydanticObjectId(req.location_id))
            if not location:
                raise ContentValidationException(f"Invalid location_id: {req.location_id}")

        post.caption = req.caption
        post.tags = req.tags
        post.media = media_objects
        post.location = location
        
        await post.save()

        # Integrate Discovery: Process Hashtags (Additive)
        if req.tags:
            discovery_service = DiscoveryService()
            await discovery_service.process_post_tags(str(post.id), req.tags)
            
        return post