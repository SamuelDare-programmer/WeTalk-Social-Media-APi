
import asyncio
from beanie import init_beanie, PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.db.models import User, UserFollows
from app.posts.models import Media, MediaType, MediaStatus
from app.stories.models import Story, StoryView
from app.stories.service import StoryService
from app.stories.schemas import CreateStoryRequest
from datetime import datetime, timezone
import uuid

async def test_story_flow():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["instagram_db"]
    await init_beanie(database=db, document_models=[User, UserFollows, Media, Story, StoryView])

    # 1. Setup Test Users
    test_user_id = str(uuid.uuid4())
    tester = User(
        username=f"tester_{test_user_id[:8]}",
        email=f"tester_{test_user_id[:8]}@example.com",
        password_hash="fake",
        first_name="Test",
        last_name="User"
    )
    await tester.insert()
    tester_id_str = str(tester.id)
    print(f"Created Test User: {tester.username} ({tester_id_str})")

    # 2. Create Test Media (Image and Video)
    img_media = Media(
        owner_id=tester_id_str,
        status=MediaStatus.ACTIVE,
        file_type=MediaType.IMAGE,
        filename="test.jpg",
        media_type="image/jpeg",
        public_id="test_img",
        view_link="http://example.com/test.jpg"
    )
    await img_media.insert()

    vid_media = Media(
        owner_id=tester_id_str,
        status=MediaStatus.PENDING, # Test pending status
        file_type=MediaType.VIDEO,
        filename="test.mp4",
        media_type="video/mp4",
        public_id="test_vid",
        view_link="http://example.com/test.mp4"
    )
    await vid_media.insert()

    # 3. Create Stories
    print("Creating Image Story...")
    img_story = await StoryService.create_story(tester_id_str, CreateStoryRequest(media_id=str(img_media.id), caption="Test Image Story"))
    
    print("Creating Video Story (Pending Media)...")
    vid_story = await StoryService.create_story(tester_id_str, CreateStoryRequest(media_id=str(vid_media.id), caption="Test Video Story"))

    # 4. Fetch Feed
    print("Fetching Feed...")
    feed = await StoryService.get_stories_feed(tester_id_str)
    print(f"Feed Items Found: {len(feed)}")
    
    found_tester = next((item for item in feed if item.user_id == tester_id_str), None)
    if found_tester:
        print(f"Tester found in feed with {len(found_tester.stories)} stories.")
        for s in found_tester.stories:
            print(f" - Story ID: {s.id}, Type: {s.media_type}, Viewed: {s.viewed}")
    else:
        print("FAIL: Tester not found in feed")

    # 5. Test Viewing
    print(f"Recording View for story {img_story.id}...")
    await StoryService.record_view(str(img_story.id), tester_id_str)
    
    print("Fetching Feed again to check 'viewed' status...")
    feed2 = await StoryService.get_stories_feed(tester_id_str)
    found_tester2 = next((item for item in feed2 if item.user_id == tester_id_str), None)
    img_story_resp = next((s for s in found_tester2.stories if s.id == str(img_story.id)), None)
    
    if img_story_resp and img_story_resp.viewed:
        print("SUCCESS: Story marked as viewed in feed.")
    else:
        print(f"FAIL: Story not marked as viewed. Resp: {img_story_resp}")

    # Cleanup
    await tester.delete()
    await img_media.delete()
    await vid_media.delete()
    await img_story.delete()
    await vid_story.delete()
    print("Verification Script Finished.")

if __name__ == "__main__":
    asyncio.run(test_story_flow())
