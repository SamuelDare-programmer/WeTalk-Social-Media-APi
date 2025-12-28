# app/posts/services/media_service.py
from fastapi import HTTPException
from app.core.services.celery_worker import upload_video_task
import cloudinary.api
import cloudinary.uploader
from cloudinary.exceptions import NotFound
from app.posts.models import Media, MediaStatus, MediaType
import asyncio
import uuid

class MediaService:
    async def upload_image(self, owner_id: str, file_content, filename: str, content_type: str, public_id: str = None):
        """
        Synchronously uploads an image and returns details immediately.
        """
        try:
            # Run blocking Cloudinary upload in a thread
            def run_upload():
                return cloudinary.uploader.upload(
                    file_content,
                    public_id=public_id,
                    resource_type="image",
                    folder="app_uploads"
                )
            
            result = await asyncio.to_thread(run_upload)

            new_media = Media(
                owner_id=owner_id,
                status=MediaStatus.ACTIVE,
                public_id=result.get("public_id"),
                view_link=result.get("secure_url"),
                media_type=content_type,
                filename=filename,
                file_type=MediaType.IMAGE
            )
            await new_media.save()

            return {
                "message": "Image uploaded successfully",
                "media_id": str(new_media.id),
                "public_id": new_media.public_id,
                "view_link": new_media.view_link
            }
        except Exception as e:
            # Log this error in a real app
            print(f"Error uploading image: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload image")

    async def process_video_background(self, file_path: str, owner_id: str, filename: str, content_type: str):
        """
        Creates a PENDING Media record and queues the upload task.
        """
        try:
            # 1. Pre-create the Media record
            new_media = Media(
                owner_id=owner_id,
                status=MediaStatus.PENDING,
                public_id=str(uuid.uuid4()), # Temporary ID until upload completes
                view_link="",
                media_type=content_type,
                filename=filename,
                file_type=MediaType.VIDEO
            )
            await new_media.save()

            # 2. Queue task with the new media_id
            upload_video_task.delay(media_id=str(new_media.id), file_path=file_path)
            
            return {
                "message": "Video processing has been queued.",
                "media_id": str(new_media.id)
            }
        except Exception as e:
            print(f"Error queuing video processing: {e}")
            raise HTTPException(status_code=500, detail="Failed to queue video processing")
        
    @staticmethod
    def verify_asset_exists(public_id: str, resource_type: str = "image"):
        """
        Verifies if an asset exists in Cloudinary.
        Returns the asset metadata dict if found.
        Raises specific exceptions if not.
        """
        try:
            # api.resource fetches details. If ID doesn't exist, it throws NotFound.
            result = cloudinary.api.resource(public_id, resource_type=resource_type)
            return result
        except NotFound:
            return None
        except Exception as e:
            # Handle rate limits or connection errors distinctively if needed
            print(f"Cloudinary API Error: {e}")
            raise e

    async def get_all_media(self):
            media = await Media.find_all().to_list()
            return media