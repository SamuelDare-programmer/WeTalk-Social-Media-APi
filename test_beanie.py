import asyncio
from beanie import init_beanie, PydanticObjectId
from beanie.operators import In
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.db.models import User
from app.core.config import settings

async def test_query():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User])
    
    # Get a random user ID
    user = await User.find_one()
    if not user:
        print("No users found")
        return
    
    uid_str = str(user.id)
    print(f"Testing with UID: {uid_str}")
    
    # Query with string
    found_with_str = await User.find(In(User.id, [uid_str])).to_list()
    print(f"Found with string ID: {len(found_with_str)}")
    
    # Query with PydanticObjectId
    found_with_obj = await User.find(In(User.id, [PydanticObjectId(uid_str)])).to_list()
    print(f"Found with PydanticObjectId: {len(found_with_obj)}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(test_query())
