from app.core.auth import utils
from app.core.auth.schemas import UserCreateModel, UserUpdateModel, PasswordResetModel
from app.core.auth.utils import hash_password, verify_password, create_url_safe_token
from app.core.db.models import User
from app.core.errors import UserAlreadyExistsException, UserNotFoundException,InvalidCredentials, UserNotUpdated, EmailNotVerifiedException
from datetime import datetime

from app.core.services.mail import send_email_background
from ..config import settings
import logging
import beanie
from fastapi.templating import Jinja2Templates
from ..services.celery_worker import send_email

templates = Jinja2Templates(directory="app/templates")
class UserService:
    async def create_user(self, user: UserCreateModel):
        # FIX 1: Single, explicit query for collision detection
        existing_user = await User.find_one(
            {"$or": [{"email": user.email}, {"username": user.username}]}
        )
        
        if existing_user:
             raise UserAlreadyExistsException()
        
        user_dict = user.model_dump()
        user_dict["password_hash"] = hash_password(user_dict.pop("password"))
        
        new_user = User(**user_dict)
        await new_user.create()
        
        token = create_url_safe_token({"email": new_user.email, "uid": str(new_user.id)})
        
        # FIX 2: Ensure protocol is present (unless handled in settings)
        # Using https:// explicitly is safer if settings.DOMAIN_NAME is just "example.com"
        link = f"https://{settings.DOMAIN_NAME}/api/v1/auth/verify/{token}"
        
        template_body = {"username": new_user.username, "link": link}
        
        # Ensure your Celery worker expects a LIST. If not, remove brackets.
        # await send_email_background([new_user.email], template_body, "Welcome to Bookly", template_name="verify_email.html")
        send_email.delay([new_user.email], "Welcome to Bookly",template_body,template_name="verify_email.html")
        
    async def get_user(self, identifier: str):
        # The correct Beanie/Mongo syntax
        user = await User.find_one({"$or": [{"email": identifier}, {"username": identifier}]})
        return user 
    
    async def get_user_by_id(self, user_id: str):
        user = await User.get(user_id)
        return user
    
    async def authenticate_user(self, identifier: str, password: str) -> dict:
        # 1. Find User
        user = await self.get_user(identifier)
        
        # 2. Verify Password
        if not user:
            raise UserNotFoundException() # Ideally returns 401 Unauthorized
        if not verify_password(password, user.password_hash):
            raise InvalidCredentials()
        if user.is_verified is False:
            raise EmailNotVerifiedException()
        
        # 3. Create Tokens (Use 'sub' for the user ID!)
        access_token = utils.create_access_token({"sub": str(user.id)})
        
        refresh_token = utils.create_access_token({"sub": str(user.id)}, refresh=True)
        token = {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
        return token
    
    async def refresh_access_token(self, token_data: dict):
        expiry_data = token_data['exp']

        if datetime.fromtimestamp(expiry_data) > datetime.now():
            access_token = utils.create_access_token({"sub": token_data['sub']})

            return access_token
        
    async def update_user(self, user_data: UserUpdateModel):
        try:
            user = await self.get_user(user_data.email)
            if not user:
                raise UserNotFoundException()
            
            # FIX 3: Critical - exclude unset fields to prevent data wiping
            user_data_dict = user_data.model_dump(exclude_unset=True)

            for k,v in user_data_dict.items():
                setattr(user, k, v)
            
            await user.save() # .save() updates; .replace() is also fine but save is often safer for partials
            return user
            
        except (ValueError, beanie.exceptions.DocumentNotFound):
            logging.error("Failed to update user")
            raise UserNotUpdated()
        except Exception as e:
            logging.exception(e)
            raise UserNotUpdated()
        
    async def delete_user(self, user_email: str):
        user_to_delete = await self.get_user(user_email)

        if not user_to_delete:
            raise UserNotFoundException()
        
        await user_to_delete.delete()

    async def verify_user_email(self, token: str):
        token_data = utils.decode_url_safe_token(token)
        print(token_data)
        print(type(token_data))
        email = token_data.get("email")
        
        user = await self.get_user(email)
        
        if not user:
            raise UserNotFoundException()
        
        user.is_verified = True
        await user.save()
        
    async def initiate_password_reset(self, email: str):
        user = await self.get_user(email)
        
        if not user:
            raise UserNotFoundException()
        
        token = create_url_safe_token({"email": user.email, "uid": str(user.id)})
        
        link = f"https://{settings.DOMAIN_NAME}/api/v1/auth/users/password_reset/confirm/{token}"
        
        template_body = {"username": user.username, "reset_link": link, "expiry_minutes": 30}
        
        # await send_email_background([user.email], template_body, "Password Reset Request", template_name="password_reset.html")
        send_email.delay([user.email], "Password Reset Request",template_body,template_name="password_reset.html")

    async def complete_password_reset(self, payload: PasswordResetModel):
        user = await self.get_user(payload.email)
        if not user:
            raise UserNotFoundException()

        user.password_hash = hash_password(payload.new_password)
        await user.save()
    