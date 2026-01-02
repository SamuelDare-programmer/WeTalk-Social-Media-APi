import asyncio
import httpx
from app.core.config import settings

async def test_radar():
    query = "Nigeria"
    limit = 5
    url = "https://api.radar.io/v1/search/autocomplete"
    headers = {
        "Authorization": f"{settings.RADAR_SECRET_KEY}"
    }
    params = {
        "query": query,
        "limit": limit,
        "layers": "place,address"
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"DEBUG: Using Key: {settings.RADAR_SECRET_KEY[:5]}...")
            response = await client.get(url, params=params, headers=headers)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("Response Data:", data)
                for addr in data.get("addresses", []):
                    print("Address Keys:", list(addr.keys()))
            else:
                print("Error Response:", response.text)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_radar())
