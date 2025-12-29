from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Optional, Any

class HashtagResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    post_count: int
    
    model_config = ConfigDict(populate_by_name=True)

class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float

class LocationResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def parse_geolocation(cls, data: Any) -> Any:
        # Check if data is a Beanie Document or object with coordinates
        if hasattr(data, "location") and hasattr(data.location, "coordinates"):
            coords = data.location.coordinates
            return {
                "_id": str(data.id),
                "name": data.name,
                "longitude": coords[0],
                "latitude": coords[1],
                "address": getattr(data, "address", None)
            }
        elif isinstance(data, dict) and "location" in data:
            # Handle dictionary case (e.g. from model_dump)
            coords = data["location"].get("coordinates", [])
            if len(coords) >= 2:
                return {
                    "_id": str(data.get("_id", data.get("id"))),
                    "name": data.get("name"),
                    "longitude": coords[0],
                    "latitude": coords[1],
                    "address": data.get("address")
                }
        return data

class UserSearchResponse(BaseModel):
    id: str = Field(alias="_id")
    username: str
    full_name: str
    avatar_url: Optional[str] = None
    is_following: bool = False
    
    model_config = ConfigDict(populate_by_name=True)