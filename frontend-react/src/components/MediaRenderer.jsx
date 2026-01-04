import React, { useState, useRef, useEffect } from 'react';
import { Play, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useVideo } from '../context/VideoContext';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const MediaRenderer = ({ media, postId, onDoubleTap, onClick, showImmersiveIcon = true }) => {
    const { isMuted, toggleMute, activeVideoId, playVideo } = useVideo();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef(null);

    const getVideoUrl = (mediaItem) => {
        const rawUrl = mediaItem.view_link || mediaItem.url;
        if (!rawUrl) return '';
        // If it's a video, ensure we have the video file extension
        if (mediaItem.media_type?.startsWith('video')) {
            return rawUrl.replace(/\.(jpg|jpeg|png|webp)$/i, '.mp4');
        }
        return rawUrl;
    };

    if (!media || media.length === 0) return null;

    const isCarousel = media.length > 1;

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % media.length);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    };

    const togglePlay = (e) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
                playVideo(postId);
            }
        }
    };

    const handleToggleMute = (e) => {
        e.stopPropagation();
        toggleMute();
    };

    const currentMedia = media[currentIndex];
    const isVideo = currentMedia.media_type?.startsWith('video');
    const displayUrl = getVideoUrl(currentMedia);

    useEffect(() => {
        if (isVideo && videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted, isVideo]);

    useEffect(() => {
        if (isVideo && videoRef.current) {
            if (activeVideoId !== postId && isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [activeVideoId, postId, isPlaying, isVideo]);

    return (
        <div
            className="relative group rounded-xl overflow-hidden bg-black aspect-square max-h-[600px] flex items-center justify-center cursor-pointer"
            onClick={onClick}
        >
            {isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center" onClick={togglePlay} onDoubleClick={() => onDoubleTap?.()}>
                    <video
                        ref={videoRef}
                        src={displayUrl}
                        className="w-full h-full object-contain"
                        loop
                        playsInline
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />

                    {/* Video Controls */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {!isPlaying && (
                            <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm">
                                <Play className="text-white fill-white size-8" />
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
                        <button
                            onClick={handleToggleMute}
                            className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all"
                        >
                            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative w-full h-full" onDoubleClick={() => onDoubleTap?.()}>
                    <img src={displayUrl} alt="Post content" className="w-full h-full object-contain" />
                </div>
            )}

            {/* Carousel Navigation */}
            {isCarousel && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-20"
                    >
                        <ChevronLeft className="size-5 sm:size-6" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-20"
                    >
                        <ChevronRight className="size-5 sm:size-6" />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/20 backdrop-blur-md z-20">
                        {media.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "size-1.5 rounded-full transition-all",
                                    idx === currentIndex ? "bg-white scale-125" : "bg-white/50"
                                )}
                            />
                        ))}
                    </div>

                    {/* Index Badge */}
                    <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold z-20">
                        {currentIndex + 1} / {media.length}
                    </div>
                </>
            )}

            {/* Immersive Icon (Maximize) */}
            {showImmersiveIcon && (
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-2 rounded-lg bg-black/40 backdrop-blur-md text-white border border-white/10 text-xs">
                        <Maximize2 className="size-4 sm:size-5" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaRenderer;
