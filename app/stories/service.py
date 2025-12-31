from datetime import datetime, timedelta, timezone
from typing import List, Dict

from beanie import Document, Link, PydanticObjectId
from app.stories.models import Story, StoryView
from app.stories.reactions_models import StoryReaction
from app.stories.schemas import CreateStoryRequest, StoryResponse, StoryFeedItem
from app.posts.models import Media, MediaStatus
from app.core.db.models import User, UserFollows
from app.core.errors import StoryNotFoundException, MediaValidationException, UnauthorizedActionException
from beanie.operators import In, And

class StoryService:
    @staticmethod
    async def create_story(user_id: str, req: CreateStoryRequest) -> Story:
        # 1. Validate Media
        media = await Media.get(PydanticObjectId(req.media_id))
        if not media or media.owner_id != user_id:
            raise MediaValidationException("Media not found")
        
        if media.status not in [MediaStatus.ACTIVE, MediaStatus.PENDING]:
             raise MediaValidationException("Media is not ready for use")

        # 2. Create Story
        # Expiry is 24 hours from now
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        story = Story(
            owner_id=user_id,
            media=media,
            caption=req.caption,
            expires_at=expires_at
        )
        await story.insert()
        print(f"Created story {story.id} for user {user_id}")
        return story

    @staticmethod
    async def get_my_stories(user_id: str) -> List[Story]:
        now = datetime.now(timezone.utc)
        return await Story.find(
            Story.owner_id == user_id,
            Story.expires_at > now
        ).sort("-created_at").to_list()

    @staticmethod
    async def get_stories_feed(user_id: str) -> List[StoryFeedItem]:
        """
        Get active stories from people the user follows.
        Grouped by User.
        """
        # 1. Get List of Followed IDs
        # This can be optimized with aggregation, but simple query first
        following = await UserFollows.find(UserFollows.follower_id == user_id).to_list()
        followed_ids = [f.following_id for f in following]
        
        # Include self in stories feed (typical pattern)
        followed_ids.append(user_id)

        now = datetime.now(timezone.utc)
        
        # 2. Fetch Active Stories
        stories = await Story.find(
            In(Story.owner_id, followed_ids),
            Story.expires_at > now
        ).sort("owner_id", "created_at").to_list()

        if not stories:
            return []
            
        # 3. Fetch User Details for these stories
        story_owner_ids = list(set([s.owner_id for s in stories]))
        story_owner_obj_ids = [PydanticObjectId(oid) for oid in story_owner_ids]
        users = await User.find(In(User.id, story_owner_obj_ids)).to_list()
        user_map = {str(u.id): u for u in users}

        # 4. Check which stories the current user has explicitly viewed
        # (Optimization: We could load all StoryViews for these stories by this user)
        story_ids = [str(s.id) for s in stories]
        views = await StoryView.find(
            In(StoryView.story_id, story_ids),
            StoryView.viewer_id == user_id
        ).to_list()
        viewed_story_ids = set([str(v.story_id) for v in views])

        # 5. Group by User
        feed_map: Dict[str, StoryFeedItem] = {}
        
        for s in stories:
            if s.owner_id not in user_map:
                continue
                
            owner = user_map[s.owner_id]
            media_item = s.media
            if hasattr(media_item, "fetch"):
                media_item = await media_item.fetch()
            
            # Construct simplified response object inside the loop
            s_resp = StoryResponse(
                id=str(s.id),
                owner_id=s.owner_id,
                media_url=media_item.view_link if media_item else "",
                media_type=media_item.file_type if media_item else "image",
                caption=s.caption,
                created_at=s.created_at,
                expires_at=s.expires_at,
                views_count=s.views_count,
                viewed=(str(s.id) in viewed_story_ids)
            )

            if s.owner_id not in feed_map:
                feed_map[s.owner_id] = StoryFeedItem(
                    user_id=str(owner.id),
                    username=owner.username,
                    avatar_url=owner.avatar_url,
                    stories=[]
                )
            
            feed_map[s.owner_id].stories.append(s_resp)

        return list(feed_map.values())
    
    @staticmethod
    async def record_view(story_id: str, user_id: str):
        story = await Story.get(PydanticObjectId(story_id))
        if not story:
            raise StoryNotFoundException("Story not found or expired")
        
        # Check if already viewed
        existing = await StoryView.find_one(
            StoryView.story_id == story_id,
            StoryView.viewer_id == user_id
        )
        
        if not existing:
            # Create View Record
            await StoryView(story_id=story_id, viewer_id=user_id).insert()
            # Increment Counter
            story.views_count += 1
            await story.save()
            return True
            
        return False

    @staticmethod
    async def get_story_viewers(story_id: str, user_id: str):
        story = await Story.get(PydanticObjectId(story_id))
        if not story:
             raise StoryNotFoundException("Story not found")
        
        if story.owner_id != user_id:
             raise UnauthorizedActionException("You can only see viewers of your own story")
             
        views = await StoryView.find(StoryView.story_id == story_id).sort("-viewed_at").to_list()
        if not views:
            return []
            
        viewer_ids = [v.viewer_id for v in views]
        viewer_obj_ids = [PydanticObjectId(vid) for vid in viewer_ids]
        users = await User.find(In(User.id, viewer_obj_ids)).to_list()
        user_map = {str(u.id): u for u in users}
        
        results = []
        for v in views:
            u = user_map.get(v.viewer_id)
            if u:
                results.append({
                    "user_id": str(u.id),
                    "username": u.username,
                    "avatar_url": u.avatar_url,
                    "viewed_at": v.viewed_at
                })
        return results

    @staticmethod
    async def add_reaction(story_id: str, user_id: str, emoji: str):
        story = await Story.get(PydanticObjectId(story_id))
        if not story:
            raise StoryNotFoundException("Story not found")
        
        reaction = StoryReaction(story_id=story_id, user_id=user_id, emoji=emoji)
        await reaction.insert()
        return True

    @staticmethod
    async def get_story_reactions(story_id: str, user_id: str):
        story = await Story.get(PydanticObjectId(story_id))
        if not story:
             raise StoryNotFoundException("Story not found")
        
        if story.owner_id != user_id:
             raise UnauthorizedActionException("You can only see reactions to your own story")
             
        reactions = await StoryReaction.find(StoryReaction.story_id == story_id).sort("-created_at").to_list()
        
        # Enrich with user details
        reacter_ids = list(set([r.user_id for r in reactions]))
        reacter_obj_ids = [PydanticObjectId(rid) for rid in reacter_ids]
        users = await User.find(In(User.id, reacter_obj_ids)).to_list()
        user_map = {str(u.id): u for u in users}
        
        results = []
        for r in reactions:
            u = user_map.get(r.user_id)
            if u:
                results.append({
                    "user_id": str(u.id),
                    "username": u.username,
                    "avatar_url": u.avatar_url,
                    "emoji": r.emoji,
                    "created_at": r.created_at
                })
        return results
