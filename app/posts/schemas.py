from pydantic import BaseModel, ConfigDict, Field
from beanie import PydanticObjectId
from ..core.auth.schemas import UserPublicModel
from .services import MediaType
from datetime import datetime
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

class UploadRequest(BaseModel):
    """
    Data required to initialize an upload with Tusky.
    """
    filename: str = Field(..., description="The original name of the file being uploaded")
    file_type: MediaType = Field(..., description="Type of media (image or video)")
    size_bytes: int = Field(..., gt=0, description="Exact file size in bytes (Required for TUS protocol)")

# --- Phase A: Upload Response (Server -> Client) ---

class UploadResponse(BaseModel):
    """
    Data returned to the client so they can perform the upload.
    """
    internal_media_id: str = Field(..., description="The ID of the PENDING record in your MongoDB")
    upload_url: str = Field(..., description="The direct TUS upload URL provided by Tusky")
    tusky_file_id: str = Field(..., description="The unique file identifier from Tusky")

# --- Phase C: Create Post Request (Client -> Server) ---

class CreatePostRequest(BaseModel):
    """
    Data required to finalize the post. 
    The client sends this AFTER they have successfully uploaded the file to 'upload_url'.
    """
    caption: str = Field(..., min_length=1, max_length=2200)
    internal_media_id: str = Field(..., description="The ID received in UploadResponse")

# --- Phase C: Post Response (Server -> Client) ---

class PostResponse(BaseModel):
    """
    Confirmation that the post was created and media verified.
    """
    message: str
    post_id: str
    media_status: str
    
    # Optional: You can include the full Post object here if you prefer
    created_at: datetime