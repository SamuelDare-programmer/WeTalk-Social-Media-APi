import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add project root to path
sys.path.append(r"c:\Users\abs\Documents\social_media_api")

# Mock modules that might cause side effects on import
sys.modules["app.discovery.service"] = MagicMock()
sys.modules["app.core.config"] = MagicMock()
sys.modules["app.core.db.models"] = MagicMock() # Mock models too if we can
# But PostService needs MediaStatus enum from models... 

# Let's mock app.discovery.service but allow app.posts.models (assuming it's safe-ish)
# We can define MediaStatus here if strictly needed, or just let it import.
# app.posts.models imports beanie, which is fine.

import asyncio

# Define MediaStatus manually to avoid import dependencies if needed, 
# or import it if we think app.posts.models is safe.
# app.posts.models imports app.discovery.models which imports nothing heavy ideally.
# Let's try importing MediaStatus from app.posts.models.
# If that hangs, we mock it.

try:
    from app.posts.models import MediaStatus
except ImportError:
    # Fallback if models import fails/hangs (unlikely)
    from enum import Enum
    class MediaStatus(str, Enum):
        PENDING = "PENDING"
        ACTIVE = "ACTIVE"
        FAILED = "FAILED"
        PROCESSING = "PROCESSING" # Add this to verify we REMOVED it from logic

async def test_fix():
    print("Verifying PostService.create_post media validation fix...")

    # We need to unpatch objects when importing implementation? 
    # No, we want to import PostService but having its dependencies mocked.
    
    # We mocked app.discovery.service in sys.modules.
    # Now when app.posts.services imports it, it gets the mock.
    
    # We still need to patch imports INSIDE app.posts.services that point to classes we want to control.
    # Like Media, Post.
    
    with patch("app.posts.services.Media") as MockMedia, \
         patch("app.posts.services.Post") as MockPost, \
         patch("app.posts.services.Location") as MockLocation:
         
        # We need to make sure we can import PostService
        # If app.posts.services imports something we didn't mock and that hangs, we catch it.
        try:
            from app.posts.services import PostService
            from app.posts.schemas import CreatePostRequest
        except Exception as e:
            print(f"Failed to import PostService: {e}")
            sys.exit(1)
            
        service = PostService()
        user_id = "user123"
        media_id = "media123"
        
        # Configure AsyncMock for get()
        MockMedia.get = AsyncMock()
        MockLocation.get = AsyncMock()

        # Test Case 1: Media is PENDING
        print("Test Case 1: MediaStatus.PENDING")
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

        # Test Case 2: Media is ACTIVE
        print("Test Case 2: MediaStatus.ACTIVE")
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

        # Test Case 3: Media is FAILED
        print("Test Case 3: MediaStatus.FAILED")
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
                print(f"SUCCESS: Correctly rejected MediaStatus.FAILED")
            else:
                print(f"WARNING: Rejected with unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(test_fix())
