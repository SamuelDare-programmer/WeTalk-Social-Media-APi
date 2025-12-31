from beanie import PydanticObjectId
from beanie.operators import In
from pymongo.errors import DuplicateKeyError
from app.engagement.models import PostLike, Comment, CommentLike, Bookmark
from app.posts.models import Post
import uuid
import asyncio
from typing import List, Optional, Dict, Any
from app.core.errors import PostNotFoundException, ContentValidationException, CommentNotFoundException, UnauthorizedActionException
from app.discovery.service import DiscoveryService
from app.discovery.models import Location
from app.core.db.models import User
from app.core.auth.schemas import UserPublicModel
from app.notification.service import NotificationService
from app.notification.models import NotificationType
from app.core.utils.text import extract_mentions, extract_hashtags

class EngagementService:
    def __init__(self):
        self.notification_service = NotificationService()

    async def like_post(self, user_id: str, post_id: str):
        """
        Likes a post. Idempotent.
        """
        try:
            # Attempt to create the like record
            # The unique index on (post_id, user_id) handles the concurrency/idempotency
            like = PostLike(user_id=user_id, post_id=post_id)
            await like.insert()
        except DuplicateKeyError:
            # User already liked this post. Return 200 OK as per requirements.
            return {"status": "success", "message": "Post already liked"}

        # If successful, increment the counter on the Post document
        # We use atomic $inc operator
        post = await Post.get(PydanticObjectId(post_id))
        if post:
            await post.inc({Post.likes_count: 1})
            
            # send_like_notification.apply_async(args=[post.owner_id, user_id, post_id], countdown=10)
            # The task would check if the PostLike record still exists before sending.
            
            # Direct Notification (In a real app, you'd debounce this)
            await self.notification_service.create_notification(
                recipient_id=post.owner_id,
                actor_id=user_id,
                type=NotificationType.LIKE,
                target_id=post_id,
                metadata={"preview": post.caption[:50] if post.caption else "post"}
            )

        return {"status": "success", "message": "Post liked"}

    async def unlike_post(self, user_id: str, post_id: str):
        """
        Unlikes a post. Idempotent.
        """
        # Find the existing like
        like = await PostLike.find_one({
            "user_id": user_id,
            "post_id": post_id
        })

        if not like:
            # User hasn't liked the post. Return 200 OK.
            return {"status": "success", "message": "Post not liked"}

        # Delete the like record
        await like.delete()

        # Decrement the counter on the Post document
        post = await Post.get(PydanticObjectId(post_id))
        if post:
            # Ensure we don't go below zero (though logic shouldn't allow it)
            if post.likes_count > 0:
                await post.inc({Post.likes_count: -1})

        return {"status": "success", "message": "Post unliked"}

    async def add_comment(self, user_id: str, post_id: str, content: str, parent_id: Optional[str] = None) -> Comment:
        # Validate Post
        post = await Post.get(PydanticObjectId(post_id))
        if not post:
            raise PostNotFoundException()
            
        # Validate Content
        if not content.strip():
            raise ContentValidationException("Content cannot be empty")
        
        # Basic Profanity Filter
        profanity_list = ["badword", "spam", "offensive"] # Replace with robust library or list
        if any(word in content.lower() for word in profanity_list):
             raise ContentValidationException("Comment contains inappropriate content")

        parent_uuid = None
        if parent_id:
            try:
                parent_uuid = uuid.UUID(parent_id)
            except ValueError:
                raise ContentValidationException("Invalid parent_id format")
            
            parent_comment = await Comment.get(parent_uuid)
            if not parent_comment:
                raise CommentNotFoundException("Parent comment not found")
            
            if parent_comment.post_id != post_id:
                raise ContentValidationException("Parent comment belongs to a different post")
            
            # Depth Check: If parent already has a parent, we can't reply to it (Max depth 2)
            if parent_comment.parent_id:
                raise ContentValidationException("Maximum comment depth reached")
                
            # Increment reply count on parent
            await parent_comment.inc({Comment.reply_count: 1})

        comment = Comment(
            post_id=post_id,
            user_id=user_id,
            parent_id=parent_uuid,
            content=content
        )
        await comment.insert()
        
        # Increment post comments count
        await post.inc({Post.comments_count: 1})
        
        # Notification for post owner
        await self.notification_service.create_notification(
            recipient_id=post.owner_id,
            actor_id=user_id,
            type=NotificationType.COMMENT,
            target_id=post_id,
            metadata={"comment_id": str(comment.id), "content": content[:50]}
        )

        # Notification for parent comment owner (if reply)
        if parent_id:
            parent_comment = await Comment.get(parent_uuid)
            if parent_comment and parent_comment.user_id != user_id:
                await self.notification_service.create_notification(
                    recipient_id=parent_comment.user_id,
                    actor_id=user_id,
                    type=NotificationType.COMMENT,
                    target_id=post_id,
                    metadata={"comment_id": str(comment.id), "parent_id": str(parent_comment.id), "content": content[:50]}
                )

        # Handle Mentions
        mentioned_usernames = extract_mentions(content)
        if mentioned_usernames:
            # Find users by username
            mentioned_users = await User.find({"username": {"$in": list(mentioned_usernames)}}).to_list()
            for m_user in mentioned_users:
                # Don't notify the author or the post owner twice (though post owner logic is separate)
                # Just notify if they are mentioned and exist
                if str(m_user.id) != user_id:
                    await self.notification_service.create_notification(
                        recipient_id=str(m_user.id),
                        actor_id=user_id,
                        type=NotificationType.MENTION,
                        target_id=post_id,
                        metadata={"comment_id": str(comment.id), "content": content[:50], "source": "comment"}
                    )
        
        # Handle Hashtags
        hashtags = extract_hashtags(content)
        if hashtags:
            discovery_service = DiscoveryService()
            await discovery_service.process_post_tags(post_id, list(hashtags))
        
        return comment
    
    async def like_comment(self, user_id: str, comment_id: str):
        try:
            # Validate UUID format
            c_uuid = uuid.UUID(comment_id)
        except ValueError:
            raise ContentValidationException("Invalid comment ID")

        try:
            like = CommentLike(user_id=user_id, comment_id=comment_id)
            await like.insert()
        except DuplicateKeyError:
            return {"status": "success", "message": "Comment already liked"}

        comment = await Comment.get(c_uuid)
        if comment:
            await comment.inc({Comment.like_count: 1})
            
            # Notification for comment author
            await self.notification_service.create_notification(
                recipient_id=comment.user_id,
                actor_id=user_id,
                type=NotificationType.LIKE, # Maybe add COMMENT_LIKE type if needed, but LIKE is fine
                target_id=str(comment.post_id),
                metadata={"comment_id": str(comment.id), "preview": comment.content[:50]}
            )
        
        return {"status": "success", "message": "Comment liked"}

    async def unlike_comment(self, user_id: str, comment_id: str):
        like = await CommentLike.find_one({
            "user_id": user_id,
            "comment_id": comment_id
        })
        if not like:
            return {"status": "success", "message": "Comment not liked"}
        
        await like.delete()
        
        try:
            c_uuid = uuid.UUID(comment_id)
            comment = await Comment.get(c_uuid)
            if comment and comment.like_count > 0:
                await comment.inc({Comment.like_count: -1})
        except ValueError:
            pass # Should not happen if like existed
            
        return {"status": "success", "message": "Comment unliked"}

    async def delete_comment(self, user_id: str, comment_id: str):
        try:
            c_uuid = uuid.UUID(comment_id)
        except ValueError:
            raise ContentValidationException("Invalid comment ID")

        comment = await Comment.get(c_uuid)
        if not comment:
            raise CommentNotFoundException()

        if comment.user_id != user_id:
            raise UnauthorizedActionException("Not authorized to delete this comment")

        # Soft Delete Logic: If it has replies, mark as deleted. Otherwise, remove it.
        if comment.reply_count > 0:
            comment.content = "[Comment deleted]"
            comment.is_deleted = True
            await comment.save()
        else:
            await comment.delete()
            # Decrement post comment count (optional, depending on business logic for soft deletes)
            # Usually we keep the count if the thread exists, but here we removed a node.
            post = await Post.get(PydanticObjectId(comment.post_id))
            if post:
                await post.inc({Post.comments_count: -1})
                
        return {"status": "success", "message": "Comment deleted"}

    async def get_comments(self, post_id: str, limit: int = 20, offset: int = 0, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        # 1. Fetch Top-Level Comments
        top_level_comments = await Comment.find(
            Comment.post_id == post_id,
            Comment.parent_id == None
        ).sort(-Comment.created_at).skip(offset).limit(limit).to_list()
        
        if not top_level_comments:
            return []

        # 2. Fetch Replies for each (Preview: Top 3)
        # We use asyncio.gather to fetch replies for all top-level comments concurrently
        async def fetch_replies(comment):
            replies = await Comment.find(
                Comment.parent_id == comment.id
            ).sort(+Comment.created_at).limit(3).to_list()
            
            # Convert to dict and add replies
            comment_dict = comment.model_dump(by_alias=True)
            comment_dict["latest_replies"] = [r.model_dump(by_alias=True) for r in replies]
            
            # Handle Soft Deletes in Response (Redaction)
            if comment.is_deleted:
                comment_dict["content"] = "[Comment deleted]"
            
            return comment_dict

        results = await asyncio.gather(*[fetch_replies(c) for c in top_level_comments])
        
        # 3. Populate user_interaction (has_liked, is_author) and Author details
        liked_ids = set()
        user_ids = set()
        
        # Collect IDs
        for c in results:
            user_ids.add(c["user_id"])
            for r in c.get("latest_replies", []):
                user_ids.add(r["user_id"])

        # Fetch Likes
        if user_id:
            all_comment_ids = []
            for c in results:
                all_comment_ids.append(str(c["_id"]))
                for r in c.get("latest_replies", []):
                    all_comment_ids.append(str(r["_id"]))
            if all_comment_ids:
                likes = await CommentLike.find(
                    CommentLike.user_id == user_id,
                    In(CommentLike.comment_id, all_comment_ids)
                ).to_list()
                liked_ids = {like.comment_id for like in likes}
        
        # Fetch Users
        users = await User.find(In(User.id, [PydanticObjectId(uid) for uid in user_ids if PydanticObjectId.is_valid(uid)])).to_list()
        user_map = {str(u.id): u for u in users}

        # Hydrate the response objects
        for c in results:
            c_id = str(c["_id"])
            c["user_interaction"] = {
                "has_liked": c_id in liked_ids,
                "is_author": c["user_id"] == user_id if user_id else False
            }
            
            author = user_map.get(c["user_id"])
            if author:
                c["author"] = UserPublicModel(**author.model_dump())
            
            for r in c.get("latest_replies", []):
                r_id = str(r["_id"])
                r["user_interaction"] = {
                    "has_liked": r_id in liked_ids,
                    "is_author": r["user_id"] == user_id if user_id else False
                }
                
                r_author = user_map.get(r["user_id"])
                if r_author:
                    r["author"] = UserPublicModel(**r_author.model_dump())

        return results

    async def bookmark_post(self, user_id: str, post_id: str):
        post = await Post.get(PydanticObjectId(post_id))
        if not post:
            raise PostNotFoundException()
            
        try:
            bookmark = Bookmark(user_id=user_id, post_id=post_id)
            await bookmark.insert()
        except DuplicateKeyError:
            return {"status": "success", "message": "Post already bookmarked"}
            
        return {"status": "success", "message": "Post bookmarked"}

    async def unbookmark_post(self, user_id: str, post_id: str):
        bookmark = await Bookmark.find_one({
            "user_id": user_id,
            "post_id": post_id
        })
        if not bookmark:
            return {"status": "success", "message": "Post not bookmarked"}
            
        await bookmark.delete()
        return {"status": "success", "message": "Post unbookmarked"}


    async def get_bookmarked_post_ids(self, user_id: str, post_ids: List[str]) -> List[str]:
        """
        Helper to fetch which posts in a list are bookmarked by the user.
        """
        bookmarks = await Bookmark.find(
            Bookmark.user_id == user_id,
            In(Bookmark.post_id, post_ids)
        ).to_list()
        return [b.post_id for b in bookmarks]

    async def get_liked_post_ids(self, user_id: str, post_ids: List[str]) -> List[str]:
        """
        Helper to fetch which posts in a list are liked by the user.
        """
        likes = await PostLike.find(
            PostLike.user_id == user_id,
            In(PostLike.post_id, post_ids)
        ).to_list()
        return [l.post_id for l in likes]

    async def get_user_bookmarks(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        # 1. Fetch Bookmarks (Newest first)
        bookmarks = await Bookmark.find(
            Bookmark.user_id == user_id
        ).sort(-Bookmark.created_at).skip(offset).limit(limit).to_list()
        
        if not bookmarks:
            return []
            
        post_ids = [b.post_id for b in bookmarks]
        
        # Rule 3: Parallelism - Fetch Posts and Likes simultaneously
        posts_task = Post.find(
            In(Post.id, [PydanticObjectId(pid) for pid in post_ids]),
            fetch_links=True
        ).to_list()
        
        likes_task = self.get_liked_post_ids(user_id, post_ids)
        
        posts, liked_ids = await asyncio.gather(posts_task, likes_task)
        
        posts_map = {str(p.id): p for p in posts}
        
        liked_set = set(liked_ids)
        
        results = []
        for b in bookmarks:
            post = posts_map.get(b.post_id)
            if post:
                # Convert Post to dict structure compatible with PostResponse
                post_dict = post.model_dump()
                post_dict["_id"] = str(post.id) # Ensure ID is string
                
                # Map media objects to match MediaResponse schema (id -> media_id)
                if post.media:
                    post_dict["media"] = [
                        {
                            "media_id": str(m.id),
                            "view_link": m.view_link,
                            "media_type": m.media_type
                        } for m in post.media
                    ]

                # Map location if exists
                if post.location:
                    # Since post.location is a Link/Document, we can dump it.
                    # The LocationResponse validator we updated will handle the dict structure.
                    loc_dump = post.location.model_dump()
                    # Ensure ID is string for the validator to pick it up if needed, 
                    # though model_dump usually keeps ObjectId unless configured otherwise.
                    loc_dump["_id"] = str(post.location.id)
                    post_dict["location"] = loc_dump

                post_dict["is_bookmarked"] = True
                post_dict["is_liked"] = b.post_id in liked_set
                results.append(post_dict)
                
        return results

    async def share_post(self, user_id: str, post_id: str, caption: Optional[str] = None, tags: List[str] = [], location_id: Optional[str] = None) -> Post:
        # 1. Validate Original Post
        original_post = await Post.get(PydanticObjectId(post_id))
        if not original_post:
            raise PostNotFoundException()
            
        # 2. Flattening: If sharing a share, share the root
        target_post_id = original_post.id
        if original_post.original_post:
            # original_post.original_post is a Link. .ref.id gets the ID.
            target_post_id = original_post.original_post.ref.id

        # 3. Validate Location (if provided)
        location = None
        if location_id:
            location = await Location.get(PydanticObjectId(location_id))
            if not location:
                raise ContentValidationException(f"Invalid location_id: {location_id}")
            
        # 4. Create New Post
        new_post = Post(
            owner_id=user_id,
            caption=caption,
            original_post=target_post_id, # Beanie handles ID -> Link conversion
            tags=tags,
            location=location,
            media=[] # Shares typically reference media via original_post, not copy it
        )
        await new_post.save()
        
        # 4. Increment Share Count on Target
        target_post = await Post.get(target_post_id)
        if target_post:
            await target_post.inc({Post.share_count: 1})
        
        # 5. Fetch links for response
        await new_post.fetch_link(Post.original_post)
        if new_post.original_post:
            await new_post.original_post.fetch_link(Post.media)

        # 6. Integrate Discovery: Process Hashtags
        if tags:
            discovery_service = DiscoveryService()
            await discovery_service.process_post_tags(str(new_post.id), tags)
            
        return new_post