from asgiref.sync import async_to_sync
from celery import Celery
from .mail import create_message, mail
from typing import List
from pydantic import EmailStr
import cloudinary.uploader
import os
import asyncio
from pymongo import AsyncMongoClient
import time
from beanie import init_beanie, PydanticObjectId
from app.core.config import settings, configure_cloudinary
from app.posts.models import Media, MediaStatus, MediaType


c_app = Celery("social_media_api")
c_app.config_from_object("app.core.config")

async def _update_media_status(media_id: str, public_id: str, view_link: str):
    """Helper to update Beanie document from sync Celery task"""
    client = AsyncMongoClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DB_NAME], document_models=[Media])
    
    media = await Media.get(PydanticObjectId(media_id))
    if media:
        media.public_id = public_id
        media.view_link = view_link
        media.status = MediaStatus.ACTIVE
        await media.save()

@c_app.task()
def send_email(recipients: List[EmailStr], subject: str, template_body: dict, template_name):
    message = create_message(recipients, template_body, subject)
    async_to_sync(mail.send_message)(message, template_name=template_name)
    print("Email sent successfully")

@c_app.task()
def upload_video_task(media_id: str, file_path: str):
    """
    Celery task to upload a video.
    """
    try:
        print(f"Starting background upload for media_id: {media_id}")
        configure_cloudinary()
        # Use upload_large for better video handling
        result = cloudinary.uploader.upload_large(
            file_path,
            resource_type="video",
            folder="app_videos",
            chunk_size=6000000
        )
        
        video_url = result.get("secure_url")
        
        # Update the pre-created media record
        asyncio.run(_update_media_status(media_id, result.get("public_id"), video_url))
        
        print(f"Background upload complete: {video_url}")
        
    except Exception as e:
        print(f"Background task failed: {e}")
    finally:
        # Clean up the local temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@c_app.task
def cleanup_temp_files():
    """
    Periodic task to clean up temporary files older than 1 hour.
    This ensures disk space is reclaimed even if workers crash.
    """
    temp_dir = "temp_uploads"
    expiry_time = 300  # 5 minutes in seconds
    
    if not os.path.exists(temp_dir):
        return

    current_time = time.time()
    count = 0
    
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        try:
            if os.path.isfile(file_path):
                file_age = current_time - os.path.getmtime(file_path)
                if file_age > expiry_time:
                    os.remove(file_path)
                    count += 1
        except Exception as e:
            print(f"Error deleting stale file {filename}: {e}")