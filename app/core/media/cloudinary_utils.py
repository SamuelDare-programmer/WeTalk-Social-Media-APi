from cloudinary.utils import cloudinary_url

def generate_hls_url(public_id: str) -> str:
    """
    Generates an HTTP Live Streaming (HLS) URL for the given video public_id.
    This enables Adaptive Bitrate Streaming (ABS).
    """
    if not public_id:
        return ""
    
    # Cloudinary transformation for HLS:
    # resource_type="video", format="m3u8"
    # transformations:
    # - vc_auto: Automatic Video Codec (h.265/vp9/h.264)
    # - q_auto: Automatic Quality
    # - fl_hls: HLS packaging (implicit with format='m3u8', but good to be explicit in some sdks)
    
    url, _ = cloudinary_url(
        public_id,
        resource_type="video",
        format="m3u8",
        transformation=[
            {"streaming_profile": "auto"}, # Smartly generates representation ladders
            {"quality": "auto"},
            {"fetch_format": "auto"}       # Ensures best container/codec
            # Note: For strict HLS, format="m3u8" is usually key.
            # "streaming_profile": "hd" or "full_hd" etc can also be used.
            # "auto" is best for general social media.
        ]
    )
    return url

def generate_optimized_mp4_url(public_id: str) -> str:
    """
    Generates a highly optimized MP4 URL for progressive download/fallback.
    """
    if not public_id:
        return ""
        
    url, _ = cloudinary_url(
        public_id,
        resource_type="video",
        format="mp4",
        transformation=[
            {"quality": "auto"},
            {"video_codec": "auto"} # Will pick best codec supported by requesting browser if possible, or usually standard h264/h265
        ]
    )
    return url

def generate_thumbnail_url(public_id: str) -> str:
    """
    Generates a poster image (thumbnail) from the video.
    """
    if not public_id:
        return ""
        
    url, _ = cloudinary_url(
        public_id,
        resource_type="video",
        format="jpg",
        transformation=[
            {"quality": "auto"},
            {"start_offset": "auto"} # Smartly picks an interesting frame
        ]
    )
    return url
