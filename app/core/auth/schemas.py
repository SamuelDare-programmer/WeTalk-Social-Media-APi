from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from beanie import PydanticObjectId 


class UserCreateModel(BaseModel):
    username: str
    email: EmailStr
    password: str 
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPublicModel(BaseModel):
 
    id: PydanticObjectId = Field(alias="_id")
    username: str
    email: EmailStr 
    first_name: str
    last_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        
        arbitrary_types_allowed=True,
        json_encoders={PydanticObjectId: str} 
    )