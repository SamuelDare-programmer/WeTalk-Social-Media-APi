# import os
# from google.oauth2 import service_account
# from googleapiclient.discovery import build

# SCOPES = ['https://www.googleapis.com/auth/drive']

# credentials_path = r"C:\Users\abs\Documents\social_media_api\wetalk-uploader-bot-482516-9aa713317e9f.json"

# creds = service_account.Credentials.from_service_account_file(
#     credentials_path, scopes=SCOPES
# )
# service = build('drive', 'v3', credentials=creds)

# # Get Shared Drives
# results = service.drives().list(pageSize=10).execute()
# drives = results.get('drives', [])

# if not drives:
#     print("❌ No Shared Drives found!")
# else:
#     print("\n📁 Available Shared Drives:")
#     for drive in drives:
#         print(f"  Name: {drive['name']}")
#         print(f"  ID: {drive['id']}\n")