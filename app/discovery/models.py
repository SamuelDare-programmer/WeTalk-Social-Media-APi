from beanie import Document, Indexed
from pydantic import BaseModel
from typing import List, Optional
from pymongo import IndexModel

class Hashtag(Document):
    name: str = Indexed(unique=True)
    post_count: int = 0
    
    class Settings:
        name = "hashtags"

class PostTag(Document):
    post_id: str
    hashtag_id: str
    
    class Settings:
        name = "post_tags"
        indexes = [
            IndexModel([("post_id", 1), ("hashtag_id", 1)], unique=True),
            IndexModel([("hashtag_id", 1)])
        ]

class GeoLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float] # [longitude, latitude]

class Location(Document):
    name: str
    location: GeoLocation
    provider_id: Optional[str] = None
    provider: Optional[str] = None
    address: Optional[str] = None
    
    class Settings:
        name = "locations"
        indexes = [
            IndexModel([("location", "2dsphere")]),
            IndexModel([("provider_id", 1)], unique=True)
        ]