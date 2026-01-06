import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

const VideoPlayer = forwardRef(({ src, fallbackSrc, poster, className, muted, loop, autoPlay, playsInline, onPlay, onPause, onTimeUpdate, onLoadedMetadata, onClick, crossOrigin }, ref) => {
    const internalVideoRef = useRef(null);
    const hlsRef = useRef(null);

    useImperativeHandle(ref, () => ({
        get node() { return internalVideoRef.current; },
        play: () => internalVideoRef.current?.play(),
        pause: () => internalVideoRef.current?.pause(),
        get currentTime() { return internalVideoRef.current?.currentTime; },
        set currentTime(val) { if (internalVideoRef.current) internalVideoRef.current.currentTime = val; },
        get duration() { return internalVideoRef.current?.duration; },
        get muted() { return internalVideoRef.current?.muted; },
        set muted(val) { if (internalVideoRef.current) internalVideoRef.current.muted = val; }
    }));

    useEffect(() => {
        const video = internalVideoRef.current;
        if (!video) return;

        // Reset HLS instance if src changes
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        // 1. Natively supported (Safari, mobile iOS)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }
        // 2. Use Hls.js
        else if (Hls.isSupported() && src) {
            const hls = new Hls({
                capLevelToPlayerSize: true, // Auto-adjust quality based on size
                autoStartLoad: false,       // Optimization: load only when needed (we can trigger this via observer if we want strict lazy, but browser preload 'metadata' helps)
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hlsRef.current = hls;

            // Start loading immediately (or could be lazy)
            hls.startLoad();
        }
        // 3. Fallback to MP4 if provided
        else if (fallbackSrc) {
            video.src = fallbackSrc;
        }
        // 4. Just use src (might be mp4)
        else {
            video.src = src;
        }

        // Critical Fix: Explicitly trigger play if autoPlay is requested.
        // The HTML autoPlay attribute often fails when source is injected dynamically or via HLS.
        if (autoPlay) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented
                    console.warn("Auto-play prevented:", error);
                });
            }
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [src, fallbackSrc, autoPlay]);

    // Handle manual muted prop sync
    useEffect(() => {
        if (internalVideoRef.current) {
            internalVideoRef.current.muted = muted;
        }
    }, [muted]);

    return (
        <video
            ref={internalVideoRef}
            poster={poster}
            className={className}
            loop={loop}
            autoPlay={autoPlay}
            playsInline={playsInline}
            muted={muted}
            onPlay={onPlay}
            onPause={onPause}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onClick={onClick}
            crossOrigin={crossOrigin}
            preload="metadata"
        />
    );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
