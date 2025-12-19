import httpx
from fastapi import HTTPException
from ..core.db.models import Media, Post, MediaStatus, MediaType
from ..core.config import settings

class MediaService:
    def __init__(self):
        # You can initialize shared resources here if needed
        pass

    async def initiate_upload(self, user_id: str, filename: str, file_type: MediaType, size_bytes: int) -> dict:
        """
        Phase A: Communicates with Tusky to reserve storage and creates a PENDING local record.
        """
        # 1. Prepare Tusky Headers
        headers = {
            "Api-Key": settings.TUSKY_API_KEY,
            "Tus-Resumable": "1.0.0",
            "Upload-Length": str(size_bytes),
            # Metadata format required by TUS protocol
            "Upload-Metadata": f"filename {filename},filetype {file_type.value},vaultId {settings.TUSKY_VAULT_ID}"
        }

        # 2. Call Tusky API
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{settings.TUSKY_API_BASE}/uploads", headers=headers)
                
                if resp.status_code not in [200, 201]:
                    # Log the actual error from Tusky for debugging
                    print(f"Tusky API Error: {resp.text}")
                    raise HTTPException(status_code=502, detail="Storage provider rejected the upload request.")
                
                upload_url = resp.headers.get("Location")
                if not upload_url:
                    raise HTTPException(status_code=502, detail="Storage provider failed to return an upload URL.")

            except httpx.RequestError as e:
                raise HTTPException(status_code=503, detail=f"Failed to connect to storage service: {str(e)}")

        # 3. Extract Tusky File ID (usually the last segment of the URL)
        tusky_file_id = upload_url.split("/")[-1]

        # 4. Create Local PENDING Record
        new_media = Media(
            owner_id=user_id,
            file_type=file_type,
            status=MediaStatus.PENDING,
            tusky_file_id=tusky_file_id,
            upload_url=upload_url
        )
        await new_media.create()

        return {
            "internal_media_id": str(new_media.id),
            "upload_url": upload_url,
            "tusky_file_id": tusky_file_id
        }

    async def verify_and_activate_media(self, internal_media_id: str, user_id: str) -> Media:
        """
        Phase C (Part 1): Verifies the file status with Tusky and updates DB to ACTIVE.
        """
        # 1. Fetch Local Record
        media_item = await Media.get(internal_media_id)
        
        if not media_item:
            raise HTTPException(status_code=404, detail="Media record not found.")
        
        if media_item.owner_id != user_id:
            raise HTTPException(status_code=403, detail="You do not own this media.")

        # 2. Skip verification if already active (Optimization)
        if media_item.status == MediaStatus.ACTIVE:
            return media_item

        # 3. Verify with Tusky
        if not media_item.tusky_file_id:
            raise HTTPException(status_code=400, detail="Media record is corrupt (missing remote ID).")

        async with httpx.AsyncClient() as client:
            headers = {"Api-Key": settings.TUSKY_API_KEY}
            try:
                # Querying the File endpoint to check final status
                resp = await client.get(f"{settings.TUSKY_API_BASE}/files/{media_item.tusky_file_id}", headers=headers)
                
                if resp.status_code == 404:
                     raise HTTPException(status_code=400, detail="File not found on storage provider. Did the upload finish?")
                
                data = resp.json()
                
                # Check if Tusky considers it 'active'
                if data.get("status") != "active":
                    raise HTTPException(status_code=400, detail="File is not yet ready/active on storage.")
                
                # Capture the permanent Walrus Blob ID
                walrus_blob_id = data.get("blobId")

            except httpx.RequestError:
                raise HTTPException(status_code=503, detail="Could not verify file status with storage provider.")

        # 4. Update Status
        media_item.status = MediaStatus.ACTIVE
        media_item.walrus_blob_id = walrus_blob_id
        await media_item.save()
        
        return media_item

class PostService:
    """
    Handles Post logic, usually depends on MediaService to verify media first.
    """
    def __init__(self):
        self.media_service = MediaService()

    async def create_post(self, user_id: str, caption: str, internal_media_id: str) -> Post:
        
        # 1. Verify Media via MediaService
        # This ensures we never create a post with broken/pending media
        active_media = await self.media_service.verify_and_activate_media(internal_media_id, user_id)

        # 2. Create Post
        new_post = Post(
            caption=caption,
            owner_id=user_id,
            media=[active_media]
        )
        await new_post.insert()
        
        return new_post