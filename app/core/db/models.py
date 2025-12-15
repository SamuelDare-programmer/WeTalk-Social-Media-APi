from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from beanie import Document, Indexed, PydanticObjectId 


class UserModel(Document):
    username: str = Indexed(unique=True)
    email: EmailStr = Indexed(unique=True)
    password_hash: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "users"

