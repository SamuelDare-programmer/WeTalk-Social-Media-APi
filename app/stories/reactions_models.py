from datetime import datetime, timezone
from beanie import Document
from pydantic import Field
from pymongo import IndexModel, ASCENDING

class StoryReaction(Document):
    story_id: str
    user_id: str
    emoji: str # e.g., "❤️", "🔥", "😂"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "story_reactions"
        indexes = [
            IndexModel([("story_id", ASCENDING), ("user_id", ASCENDING)]),
            # TTL: Auto-clean after 24 hours (or match story expiry)
            # Since stories expire in 5m or 24h, we can set a safe buffer of 48h
            IndexModel([("created_at", ASCENDING)], expireAfterSeconds=172800)
        ]
