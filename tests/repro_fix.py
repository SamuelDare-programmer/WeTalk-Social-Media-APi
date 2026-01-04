import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.auth.service import UserService
from app.core.db.models import User
from app.core.config import settings

async def test():
    print("Starting verification test...")
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(database=client[settings.DB_NAME], document_models=[User])
        print("Beanie initialized.")
        
        service = UserService()
        
        # This used to crash with Pydantic ValidationError
        print("Testing with invalid ID: 'SamuelOlu'...")
        user = await service.get_user_by_id("SamuelOlu")
        print(f"Result for 'SamuelOlu': {user}")
        
        assert user is None
        print("Test passed: Gracefully handled invalid ID.")
        
    except Exception as e:
        print(f"Test failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test())
