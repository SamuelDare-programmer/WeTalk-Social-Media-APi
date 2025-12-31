
import asyncio
from app.core.db.models import User
from beanie import init_beanie
from pymongo import AsyncMongoClient
from app.core.config import settings

async def main():
    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[User])
    u1 = await User.find_one(User.email == 'madehinsamuel@gmail.com')
    u2 = await User.find_one(User.email == 'oluyemisamuel101@gmail.com')
    print(f'U1_ID: {u1.id if u1 else "None"}')
    print(f'U2_ID: {u2.id if u2 else "None"}')
    await client.close()

if __name__ == "__main__":
    asyncio.run(main())
