# from fastapi import APIRouter, UploadFile, File, HTTPException
# from app.core.services.tusky import TuskyClient
# import os
# from app.core.config import settings

# router = APIRouter()

# # Initialize Client (Best done in settings/startup)
# TUSKY_API_KEY = settings.TUSKY_API_KEY
# tusky_client = TuskyClient(api_key=TUSKY_API_KEY)

# @router.post("/upload/image")
# async def upload_image(file: UploadFile = File(...)):
#     # 1. Validate file type
#     if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
#         raise HTTPException(status_code=400, detail="Invalid image type")
    
#     # 2. Read file content
#     file_content = await file.read()
    
#     try:
#         # 3. Upload to Tusky and get public URL
#         public_url = await tusky_client.upload_file(
#             file_bytes=file_content,
#             filename=file.filename,
#             mime_type=file.content_type
#         )
        
#         return {
#             "status": "success", 
#             "url": public_url,
#             "provider": "Tusky/Walrus"
#         }
        
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")