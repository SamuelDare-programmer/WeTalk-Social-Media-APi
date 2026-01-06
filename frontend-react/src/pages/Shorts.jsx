import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from '../api/axios';
import { Heart, MessageSquare, Music2, Loader2, Volume2, VolumeX, ChevronLeft, Play, Pause } from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PostDetailModal from '../components/PostDetailModal';
import VideoPlayer from '../components/VideoPlayer';
import useInfiniteScroll from '../hooks/useInfiniteScroll';

const ShortCard = ({ post, mediaItem, isActive, onComment }) => {
    const videoRef = useRef(null);
    // ... (rest of context hooks)
    const { isMuted, setIsMuted, toggleMute, playVideo } = useVideo();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [liked, setLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showHeart, setShowHeart] = useState(false);
    const [authorMetadata, setAuthorMetadata] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackType, setFeedbackType] = useState('play'); // 'play' or 'pause'
    const lastTap = useRef(0);

    const author = authorMetadata || post.author || post.user || {};
    const username = author.username || 'unknown';
    const avatarUrl = author.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=random`;
    const caption = post.caption || post.content || '';

    const isOwner = user?.id === author?.id || user?._id === author?.id;
    const postId = post.id || post._id;
    const ownerId = post.owner_id || post.user_id || author.id || author._id;

    // Fetch-on-demand metadata if missing
    useEffect(() => {
        if (!author.username && ownerId) {
            const fetchAuthor = async () => {
                try {
                    const res = await axios.get(`/auth/users/${ownerId}`);
                    setAuthorMetadata(res.data);
                    if (res.data.is_following !== undefined) setIsFollowing(res.data.is_following);
                } catch (err) {
                    console.error("Failed to fetch author metadata", err);
                }
            };
            fetchAuthor();
        } else if (author.is_following !== undefined) {
            setIsFollowing(author.is_following);
        }
    }, [ownerId, author.username]);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.currentTime = 0;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name === 'NotAllowedError') {
                        if (videoRef.current) {
                            videoRef.current.muted = true;
                            setIsMuted(true);
                            videoRef.current.play().catch(e => console.error("Muted autoplay failed", e));
                        }
                    }
                });
            }
            setIsPlaying(true);
            playVideo(postId);
        } else if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive, postId, playVideo]);

    const handleTap = (e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Double tap
            handleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        } else {
            // Single tap
            if (videoRef.current) {
                if (isPlaying) {
                    videoRef.current.pause();
                    setFeedbackType('pause');
                } else {
                    videoRef.current.play();
                    setFeedbackType('play');
                }
                setIsPlaying(!isPlaying);
                setShowFeedback(true);
                setTimeout(() => setShowFeedback(false), 600);
            }
        }
        lastTap.current = now;
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const onTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const onLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleLike = async () => {
        const nextLiked = !liked;
        setLiked(nextLiked);
        setLikesCount(prev => nextLiked ? prev + 1 : prev - 1);

        try {
            if (nextLiked) {
                await axios.post(`/posts/${postId}/likes`);
            } else {
                await axios.delete(`/posts/${postId}/likes`);
            }
        } catch (err) {
            console.error('Like failed', err);
            setLiked(!nextLiked);
            setLikesCount(prev => !nextLiked ? prev + 1 : prev - 1);
        }
    };

    const handleFollow = async () => {
        const nextFollowing = !isFollowing;
        setIsFollowing(nextFollowing);
        try {
            if (nextFollowing) {
                await axios.post(`/users/${username}/follow`);
            } else {
                await axios.post(`/users/${username}/unfollow`);
            }
        } catch (err) {
            console.error('Follow failed', err);
            setIsFollowing(!nextFollowing);
        }
    };

    // Use passed mediaItem OR find the first video (fallback)
    const media = mediaItem || post.media?.find(m => m.media_type?.startsWith('video'));

    // Prefer explicitly generated URLs from backend, fallback to manual fixes
    const hlsUrl = media?.hls_url;
    const optimizedUrl = media?.optimized_url || media?.view_link?.replace(/\.(jpg|jpeg|png|webp)$/i, ".mp4").replace(/\.[^/.]+$/, ".mp4");
    const thumbUrl = media?.thumbnail_url || media?.view_link?.replace(/\.[^/.]+$/, ".jpg");

    // For VideoPlayer src, we want HLS if available, otherwise optimizedUrl
    const videoSrc = hlsUrl || optimizedUrl;

    return (
        <div className="relative h-full w-full bg-slate-900 snap-start flex items-center justify-center overflow-hidden">
            {/* Blurred Background for immersion */}
            <div className="absolute inset-0 z-0">
                <img
                    src={thumbUrl}
                    className="h-full w-full object-cover blur-3xl opacity-50 scale-110"
                    alt=""
                />
            </div>

            {videoSrc ? (
                <VideoPlayer
                    ref={videoRef}
                    src={videoSrc}
                    fallbackSrc={optimizedUrl}
                    poster={thumbUrl}
                    className="relative z-10 max-h-full w-auto object-contain shadow-2xl transition-transform duration-300"
                    loop
                    playsInline
                    muted={isMuted}
                    onClick={handleTap}
                    onTimeUpdate={onTimeUpdate}
                    onLoadedMetadata={onLoadedMetadata}
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="relative z-10 flex items-center justify-center text-white/50">
                    <Loader2 className="size-8 animate-spin" />
                </div>
            )}

            {/* Tap Animations */}
            <AnimatePresence>
                {showHeart && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="absolute inset-x-0 inset-y-0 flex items-center justify-center z-30 pointer-events-none"
                    >
                        <Heart className="size-32 text-white fill-white drop-shadow-2xl opacity-80" />
                    </motion.div>
                )}

                {showFeedback && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: feedbackType === 'play' ? 0 : -10 }}
                        animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
                        exit={{ opacity: 0, scale: 2, rotate: 10 }}
                        className="absolute inset-x-0 inset-y-0 flex items-center justify-center z-40 pointer-events-none"
                    >
                        <div className="p-8 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 shadow-2xl">
                            {feedbackType === 'play' ? (
                                <Play className="size-12 fill-current" />
                            ) : (
                                <Pause className="size-12 fill-current" />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay */}
            <div className="absolute inset-0 z-15 bg-black/20 pointer-events-none" />

            {/* Interaction Sidebar */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 z-20">
                <button
                    onClick={handleLike}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className={`p-3 rounded-full bg-black/20 backdrop-blur-md group-hover:bg-black/40 transition-all ${liked ? 'text-pink-500' : 'text-white'}`}>
                        <Heart className={`size-7 ${liked ? 'fill-current' : ''}`} />
                    </div>
                    <span className="text-white text-xs font-bold">{likesCount}</span>
                </button>

                <button
                    onClick={onComment}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className="p-3 rounded-full bg-black/20 backdrop-blur-md group-hover:bg-black/40 transition-all text-white">
                        <MessageSquare className="size-7" />
                    </div>
                    <span className="text-white text-xs font-bold">{post.comments_count || 0}</span>
                </button>

                <button
                    onClick={toggleMute}
                    className="p-3 rounded-full bg-black/20 backdrop-blur-md group-hover:bg-black/40 transition-all text-white"
                >
                    {isMuted ? <VolumeX className="size-7" /> : <Volume2 className="size-7" />}
                </button>
            </div>

            {/* Title & Info */}
            <div className="absolute left-0 right-16 bottom-12 p-6 z-40 pointer-events-none">
                <div className="flex items-center gap-3 mb-4 pointer-events-auto w-fit">
                    <img
                        src={avatarUrl}
                        className="size-10 rounded-full border-2 border-white cursor-pointer"
                        alt=""
                        onClick={() => username && navigate(`/profile/${username}`)}
                    />
                    <span className="text-white font-bold text-lg cursor-pointer" onClick={() => username && navigate(`/profile/${username}`)}>
                        @{username}
                    </span>

                    {!isOwner && (
                        <button
                            onClick={handleFollow}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${isFollowing
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-white text-black hover:bg-white/90'
                                }`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>
                <p className="text-white text-sm mb-4 line-clamp-2 max-w-md pointer-events-none">
                    {caption}
                </p>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                    <Music2 className="size-4 animate-spin-slow" />
                    <span className="truncate">Original Audio - {username}</span>
                </div>
            </div>

            {/* Progress Bar scrubber */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-2 pt-8 bg-gradient-to-t from-black/60 to-transparent flex flex-col gap-1 transition-opacity opacity-60 hover:opacity-100 group">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all hover:h-1.5"
                    style={{
                        background: `linear-gradient(to right, white ${(currentTime / duration) * 100}%, rgba(255, 255, 255, 0.2) ${(currentTime / duration) * 100}%)`
                    }}
                />
                <div className="flex justify-between px-1">
                    <span className="text-[10px] text-white/50 font-mono">
                        {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-white/50 font-mono">
                        {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
                    </span>
                </div>
            </div>
        </div>
    );
};

const Shorts = () => {
    const navigate = useNavigate();
    const { isMuted, setIsMuted, toggleMute } = useVideo();
    const fetchShorts = useCallback(async (offset, limit) => {
        const res = await axios.get(`/discovery/shorts?limit=${limit}&offset=${offset}`);

        // Explode Logic: Create a unique feed item for EVERY video in a post
        const explodedItems = res.data.flatMap(post => {
            // Filter for videos (checking both type and URL as fallback)
            const videos = post.media?.filter(m =>
                (m.media_type && m.media_type.startsWith('video')) ||
                (m.view_link && m.view_link.includes('/video/upload/')) ||
                (m.media_type === 'video') // Extra safety
            ) || [];

            return videos.map((video, idx) => ({
                _feedId: `${post.id || post._id}_${video.media_id || video._id || idx}`,
                post: post,
                mediaItem: video
            }));
        });
        return explodedItems;
    }, []);

    const {
        items: feedItems,
        loading,
        lastElementRef,
    } = useInfiniteScroll(fetchShorts, { limit: 10 });

    const handleScroll = () => {
        if (!containerRef.current) return;
        const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
        setActiveIndex(index);
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
                <Loader2 className="size-10 text-primary animate-spin" />
                <p className="text-slate-400 mt-4 font-medium">Fastening your seatbelt...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 lg:left-20 bg-black z-[60] overflow-hidden">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-6 left-6 z-[70] p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all active:scale-95 flex items-center justify-center border border-white/10"
            >
                <ChevronLeft className="size-6" />
            </button>
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar scroll-smooth"
            >
                {feedItems.length > 0 ? (
                    feedItems.map((item, idx) => {
                        const isLast = feedItems.length === idx + 1;
                        return (
                            <div key={item._feedId} ref={isLast ? lastElementRef : null} className="h-full snap-start">
                                <ShortCard
                                    post={item.post}
                                    mediaItem={item.mediaItem}
                                    isActive={idx === activeIndex}
                                    onComment={() => setSelectedPost(item.post)}
                                />
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex items-center justify-center text-white/50">
                        No video content found.
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedPost && (
                    <PostDetailModal
                        post={selectedPost}
                        onClose={() => setSelectedPost(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Shorts;
