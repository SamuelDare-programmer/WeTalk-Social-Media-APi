# import os
# import io
# from google.oauth2 import service_account
# from googleapiclient.discovery import build
# from googleapiclient.http import MediaIoBaseUpload
# from fastapi import HTTPException

# SCOPES = ['https://www.googleapis.com/auth/drive']

# # ❌ THIS IS A FOLDER ID, NOT A SHARED DRIVE ID
# # FOLDER_ID = "1TNCpETqUtiMfDX_cC-p8Z5GnhwS-IUr6" 

# # ✅ YOU NEED TO GET YOUR SHARED DRIVE ID (see method below)
# SHARED_DRIVE_ID = "YOUR_SHARED_DRIVE_ID_HERE"  # Replace this!

# class GoogleDriveService:
#     def __init__(self):
#         self.credentials_path = "C:\\Users\\abs\\Documents\\social_media_api\\wetalk-uploader-bot-482516-9aa713317e9f.json"
        
#         if not os.path.exists(self.credentials_path):
#             raise Exception("❌ google_credentials.json not found! Please add it to root.")

#         self.creds = service_account.Credentials.from_service_account_file(
#             self.credentials_path, scopes=SCOPES
#         )
#         self.service = build('drive', 'v3', credentials=self.creds)

#     def get_shared_drive_id(self):
#         """Helper method to find your Shared Drive ID"""
#         try:
#             results = self.service.drives().list(pageSize=10).execute()
#             drives = results.get('drives', [])
            
#             if not drives:
#                 print("❌ No Shared Drives found!")
#                 return None
            
#             print("\n📁 Available Shared Drives:")
#             for drive in drives:
#                 print(f"  Name: {drive['name']}")
#                 print(f"  ID: {drive['id']}\n")
            
#             return drives[0]['id'] if drives else None
#         except Exception as e:
#             print(f"❌ Error listing Shared Drives: {e}")
#             return None

#     def upload_file(self, file_content: bytes, filename: str, mime_type: str) -> dict:
#         try:
#             file_metadata = {
#                 "name": filename,
#                 "parents": [SHARED_DRIVE_ID]  # ✅ Use Shared Drive ID as parent
#             }

#             media = MediaIoBaseUpload(
#                 io.BytesIO(file_content),
#                 mimetype=mime_type,
#                 resumable=False
#             )

#             file = self.service.files().create(
#                 body=file_metadata,
#                 media_body=media,
#                 fields="id",
#                 supportsAllDrives=True  # ✅ Required for Shared Drives
#             ).execute()

#             file_id = file["id"]

#             # Make file publicly accessible
#             self.service.permissions().create(
#                 fileId=file_id,
#                 body={"role": "reader", "type": "anyone"},
#                 supportsAllDrives=True  # ✅ Required for Shared Drives
#             ).execute()

#             return {
#                 "file_id": file_id,
#                 "view_link": f"https://drive.google.com/uc?id={file_id}",
#                 "download_link": f"https://drive.google.com/uc?export=download&id={file_id}"
#             }

#         except Exception as e:
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"Google Drive upload failed: {str(e)}"
#             )