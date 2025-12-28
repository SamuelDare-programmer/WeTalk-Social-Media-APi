# # app/services/tusky.py
# import httpx
# import asyncio
# from fastapi import HTTPException


# class TuskyClient:
#     def __init__(self, api_key: str):
#         if not api_key:
#             raise ValueError("TUSKY_API_KEY is missing in settings")
#         self.base_url = "https://api.tusky.io"
#         self.headers = {"Api-Key": api_key, "Accept": "application/json"}
#         # Walrus Mainnet Aggregator
#         self.public_aggregator = (
#             "https://walrus.tusky.io"
#         )

#     async def get_or_create_vault(self, vault_name="Social_Uploads") -> str:
#         async with httpx.AsyncClient() as client:
#             # 1. Check existing vaults
#             resp = await client.get(f"{self.base_url}/vaults", headers=self.headers)
#             if resp.status_code == 200:
#                 for vault in resp.json().get("items", []):
#                     if vault["name"] == vault_name:
#                         return vault["id"]

#             # 2. Create new vault (Must be encrypted=False for public feed)
#             create_payload = {"name": vault_name, "encrypted": False}
#             create_resp = await client.post(
#                 f"{self.base_url}/vaults", json=create_payload, headers=self.headers
#             )
#             create_resp.raise_for_status()
#             return create_resp.json()["id"]

#     async def upload_file(
#         self, file_bytes: bytes, filename: str, mime_type: str
#     ) -> str:
#         vault_id = await self.get_or_create_vault()

#         async with httpx.AsyncClient() as client:
#             # 1. Upload to Staging
#             params = {"vaultId": vault_id, "filename": filename, "filetype": mime_type}

#             resp = await client.post(
#                 f"{self.base_url}/uploads",
#                 headers={**self.headers, "Content-Type": "application/octet-stream"},
#                 params=params,
#                 content=file_bytes,
#             )
#             resp.raise_for_status()

#             # --- DEBUGGING START ---
#             data = resp.json()
#             print(
#                 f"DEBUG: Tusky Response: {data}"
#             )  # <--- Check your terminal for this!
#             # --- DEBUGGING END ---

#             # Try to find the ID in standard JSON, 'data' wrapper, or 'uploadId'
#             if "id" in data:
#                 tusky_id = data["id"]
#             elif "data" in data and "id" in data["data"]:
#                 tusky_id = data["data"]["id"]
#             elif "uploadId" in data:
#                 tusky_id = data["uploadId"]
#             else:
#                 # Fallback: TUS protocol often puts the ID in the 'Location' header
#                 location = resp.headers.get("Location")
#                 if location:
#                     tusky_id = location.split("/")[-1]
#                 else:
#                     raise ValueError(f"Could not find ID in Tusky response: {data}")

#             # ... inside upload_file method ...

#             # 2. Poll for Walrus Blob ID
#             # We wait until we get a REAL ID (not "unknown")
#             for _ in range(15): # Increased to 15 attempts (30s) just in case
#                 await asyncio.sleep(2)
                
#                 check = await client.get(f"{self.base_url}/files/{tusky_id}", headers=self.headers)
                
#                 if check.status_code == 200:
#                     file_info = check.json()
#                     blob_id = file_info.get('blobId')
                    
#                     # THE FIX: Ensure blob_id exists AND is not "unknown"
#                     if blob_id and blob_id != "unknown":
#                         return f"{self.public_aggregator}/{blob_id}"
            
#             # If we exit the loop, it means Walrus is taking too long
#             raise HTTPException(status_code=504, detail="Walrus certification timed out. Try again.")