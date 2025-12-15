from pydantic import BaseModel, ConfigDict, Field
from beanie import PydanticObjectId
from ..core.auth.schemas import UserPublicModel

class PostCreate(BaseModel):
    caption: str
    image_url: str

class PostPublic(BaseModel):
    id: PydanticObjectId = Field(alias="_id")
    user_id: str
    image_url: str
    caption: str
    created_at: str
    likes: int
    user : UserPublicModel

    model_config = ConfigDict(populate_by_name=True)