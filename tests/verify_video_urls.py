import asyncio
from app.posts.models import Media, MediaType, MediaStatus
from app.core.media.cloudinary_utils import generate_hls_url, generate_optimized_mp4_url, generate_thumbnail_url

async def test_url_generation():
    print("--- Testing Cloudinary URL Generation ---")
    
    public_id = "test_video_id"
    
    # 1. Test raw Utils
    hls = generate_hls_url(public_id)
    mp4 = generate_optimized_mp4_url(public_id)
    thumb = generate_thumbnail_url(public_id)
    
    print(f"HLS URL: {hls}")
    assert "resource_type=video" in hls or "/video/" in hls
    assert "format=m3u8" in hls or ".m3u8" in hls
    assert "streaming_profile=auto" in hls or "sp_auto" in hls
    
    print(f"MP4 URL: {mp4}")
    assert ".mp4" in mp4
    assert "quality=auto" in mp4 or "q_auto" in mp4
    
    print(f"Thumb URL: {thumb}")
    assert ".jpg" in thumb
    
    # 2. Test Media Model Property
    media = Media(
        owner_id="user123",
        status=MediaStatus.ACTIVE,
        file_type=MediaType.VIDEO,
        filename="test.mp4",
        media_type="video/mp4",
        public_id=public_id,
        view_link="http://old-link.com/video.mp4"
    )
    
    print("\n--- Testing Media Model Properties ---")
    print(f"Media.hls_url: {media.hls_url}")
    assert media.hls_url == hls
    
    print(f"Media.optimized_url: {media.optimized_url}")
    assert media.optimized_url == mp4
    
    print(f"Media.thumbnail_url: {media.thumbnail_url}")
    assert media.thumbnail_url == thumb
    
    print("\n✅ Verification SUCCESS!")

if __name__ == "__main__":
    asyncio.run(test_url_generation())
