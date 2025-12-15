from app.core.auth import utils
from app.core.auth.schemas import UserCreateModel
from app.core.auth.utils import hash_password, verify_password
from app.core.db.models import UserModel
from app.core.exceptions import UserAlreadyExistsException, UserNotFoundException

class UserService:
    async def create_user(self, user: UserCreateModel):
        # 1. Check for duplicates
        # We check if a user exists with this email OR this username
        existing_user = await self.get_user(user.email) or await self.get_user(user.username)
        
        if existing_user:
             raise UserAlreadyExistsException()
        
        # 2. Prepare data
        user_dict = user.model_dump()
        user_dict["password_hash"] = hash_password(user_dict.pop("password"))
        
        # 3. Save to DB
        new_user = UserModel(**user_dict)
        await new_user.create() # Beanie's .create() is cleaner than .insert()
        return new_user

    async def get_user(self, identifier: str):
        # The correct Beanie/Mongo syntax
        user = await UserModel.find_one({"$or": [{"email": identifier}, {"username": identifier}]})
        return user 
    
    async def get_user_by_id(self, user_id: str):
        user = await UserModel.get(user_id)
        return user
    
    async def authenticate_user(self, identifier: str, password: str) -> dict:
        # 1. Find User
        user = await self.get_user(identifier)
        
        # 2. Verify Password
        if not user or not verify_password(password, user.password_hash):
            raise UserNotFoundException() # Ideally returns 401 Unauthorized
            
        # 3. Create Tokens (Use 'sub' for the user ID!)
        access_token = utils.create_access_token({"sub": str(user.id)})
        
        refresh_token = utils.create_access_token({"sub": str(user.id)}, refresh=True)
        token = {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
        return token