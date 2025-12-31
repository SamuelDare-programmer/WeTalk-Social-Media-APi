import asyncio
import sys
import os
from unittest.mock import MagicMock, patch, AsyncMock

# Add project root to path
sys.path.append(r"c:\Users\abs\Documents\social_media_api")

from app.posts.models import MediaStatus

async def test_fix():
    print("Verifying PostService.create_post media validation fix...")
    
    # Mock dependencies
    with patch("app.posts.services.Media") as MockMedia, \
         patch("app.posts.services.Post") as MockPost, \
         patch("app.posts.services.Location") as MockLocation, \
         patch("app.posts.services.DiscoveryService") as MockDiscovery:
        
        from app.posts.services import PostService
        from app.posts.schemas import CreatePostRequest
        
        service = PostService()
        user_id = "user123"
        media_id = "media123"
        
        # Configure Media.get as AsyncMock
        MockMedia.get = AsyncMock()
        
        # Test Case 1: Media is PENDING (Should Pass now)
        print("\nTest Case 1: MediaStatus.PENDING")
        mock_media_pending = MagicMock()
        mock_media_pending.owner_id = user_id
        mock_media_pending.status = MediaStatus.PENDING
        mock_media_pending.id = media_id
        
        MockMedia.get.return_value = mock_media_pending
        
        req = CreatePostRequest(media_ids=[media_id], caption="Test Video Post")
        
        try:
            await service.create_post(user_id, req)
            print("SUCCESS: Accepted MediaStatus.PENDING")
        except Exception as e:
            print(f"FAILURE: Raised exception for MediaStatus.PENDING: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

        # Test Case 2: Media is ACTIVE (Should Pass)
        print("\nTest Case 2: MediaStatus.ACTIVE")
        mock_media_active = MagicMock()
        mock_media_active.owner_id = user_id
        mock_media_active.status = MediaStatus.ACTIVE
        mock_media_active.id = media_id
        
        MockMedia.get.return_value = mock_media_active
        
        try:
            await service.create_post(user_id, req)
            print("SUCCESS: Accepted MediaStatus.ACTIVE")
        except Exception as e:
            print(f"FAILURE: Raised exception for MediaStatus.ACTIVE: {e}")
            sys.exit(1)
            
        # Test Case 3: Media is FAILED (Should Fail)
        print("\nTest Case 3: MediaStatus.FAILED")
        mock_media_failed = MagicMock()
        mock_media_failed.owner_id = user_id
        mock_media_failed.status = MediaStatus.FAILED
        mock_media_failed.id = media_id
        
        MockMedia.get.return_value = mock_media_failed
        
        try:
            await service.create_post(user_id, req)
            print("FAILURE: Accepted MediaStatus.FAILED (Should have raised exception)")
            sys.exit(1)
        except Exception as e:
            if "Media is not ready" in str(e):
                print(f"SUCCESS: Correctly rejected MediaStatus.FAILED with error: {e}")
            else:
                print(f"WARNING: Rejected with unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(test_fix())
