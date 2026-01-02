from app.posts.schemas import CreatePostRequest
from .models import Media, Post, MediaStatus
from beanie import PydanticObjectId
from beanie.operators import In
from bson.errors import InvalidId
from app.core.errors import PostNotFoundException, MediaValidationException, UnauthorizedActionException, ContentValidationException
from app.discovery.models import Location
from app.discovery.service import DiscoveryService
from app.notification.service import NotificationService
from app.notification.models import NotificationType
from app.core.utils.text import extract_mentions, extract_hashtags
from app.core.db.models import User

class PostService:
    def __init__(self):
        self.notification_service = NotificationService()

    async def create_post(self, user_id: str, req: CreatePostRequest) -> Post:
        media_objects = []
        for media_id in req.media_ids:
            media = await Media.get(PydanticObjectId(media_id))
            if not media or media.owner_id != user_id:
                raise MediaValidationException(f"Invalid media_id: {media_id}")
            allowed_statuses = [MediaStatus.ACTIVE, MediaStatus.PENDING]
            if media.status not in allowed_statuses:
                raise MediaValidationException(f"Media is not ready (Status: {media.status}): {media_id}")
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
        tags_to_process = set(req.tags or [])
        if req.caption:
            tags_to_process.update(extract_hashtags(req.caption))
            
        if tags_to_process:
            discovery_service = DiscoveryService()
            await discovery_service.process_post_tags(str(new_post.id), list(tags_to_process))
            # Optionally update the post document if we want hashtags extracted from caption to be in the tags field
            if tags_to_process != set(req.tags or []):
                new_post.tags = list(tags_to_process)
                await new_post.save()

        # Handle Mentions
        if req.caption:
            mentioned_usernames = extract_mentions(req.caption)
            if mentioned_usernames:
                mentioned_users = await User.find({"username": {"$in": list(mentioned_usernames)}}).to_list()
                for m_user in mentioned_users:
                    if str(m_user.id) != user_id:
                        await self.notification_service.create_notification(
                            recipient_id=str(m_user.id),
                            actor_id=user_id,
                            type=NotificationType.MENTION,
                            target_id=str(new_post.id),
                            metadata={"preview": req.caption[:50], "source": "post"}
                        )
            
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

    async def get_liked_posts(self, user_id: str, limit: int = 10, offset: int = 0) -> list[Post]:
        from app.engagement.models import PostLike
        
        # Get post IDs liked by user (newest likes first)
        likes = await PostLike.find(PostLike.user_id == user_id).sort(-PostLike.created_at).skip(offset).limit(limit).to_list()
        if not likes:
            return []
            
        post_ids = []
        for like in likes:
            try:
                post_ids.append(PydanticObjectId(like.post_id))
            except (InvalidId, TypeError):
                continue

        posts = await Post.find(In(Post.id, post_ids), fetch_links=True).to_list()
        
        # Sort posts by the order they appear in 'likes'
        posts_map = {str(p.id): p for p in posts}
        ordered_posts = []
        for like in likes:
            p = posts_map.get(like.post_id)
            if p:
                ordered_posts.append(p)
                
        return ordered_posts

    async def delete_post(self, post_id: str, user_id: str):
        post = await Post.get(PydanticObjectId(post_id), fetch_links=True)
        if not post:
            raise PostNotFoundException()
        
        if post.owner_id != user_id:
            raise UnauthorizedActionException("You are not authorized to delete this post")
        
        # Delete associated media from Cloudinary and database
        if post.media:
            import cloudinary.uploader
            from app.core.config import configure_cloudinary
            configure_cloudinary()
            
            for media in post.media:
                if media.public_id:
                    try:
                        # Determine resource type based on file type
                        from .models import MediaType
                        resource_type = "video" if media.file_type == MediaType.VIDEO else "image"
                        cloudinary.uploader.destroy(media.public_id, resource_type=resource_type)
                        print(f"Deleted Cloudinary asset: {media.public_id}")
                    except Exception as e:
                        # Continue with deletion even if Cloudinary fails
                        pass
            
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
            allowed_statuses = [MediaStatus.ACTIVE, MediaStatus.PENDING]
            if media.status not in allowed_statuses:
                raise MediaValidationException(f"Media is not ready (Status: {media.status}): {media_id}")
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