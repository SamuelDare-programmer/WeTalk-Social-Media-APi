from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from beanie import Document, Indexed, Link


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


class PostModel(Document):
    user: Link["UserModel"]
    image_url: Optional[str] = None
    caption: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    likes: int = 0
    class Settings:
        name = "posts"