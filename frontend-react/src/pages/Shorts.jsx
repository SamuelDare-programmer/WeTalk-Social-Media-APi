import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import { Heart, MessageSquare, Music2, Loader2, Volume2, VolumeX, ChevronLeft } from 'lucide-react';
import { useVideo } from '../context/VideoContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PostDetailModal from '../components/PostDetailModal';

const ShortCard = ({ post, isActive, onComment }) => {
    const videoRef = useRef(null);
    const { isMuted, toggleMute, playVideo } = useVideo();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [liked, setLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [isFollowing, setIsFollowing] = useState(post.author?.is_following);

    const isOwner = user?.id === post.author?.id || user?._id === post.author?.id;
    const postId = post.id || post._id;

    useEffect(() => {
        if (isActive && videoRef.current) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name === 'NotAllowedError') {
                        // Fallback to muted autoplay if browser blocks unmuted
                        if (videoRef.current) {
                            videoRef.current.muted = true;
                            videoRef.current.play().catch(e => console.error("Muted autoplay failed", e));
                        }
                    } else {
                        console.log("Autoplay failed", error);
                    }
                });
            }
            playVideo(postId);
        } else if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [isActive, postId, playVideo]);

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
                await axios.post(`/users/${post.author.username}/follow`);
            } else {
                await axios.post(`/users/${post.author.username}/unfollow`);
            }
        } catch (err) {
            console.error('Follow failed', err);
            setIsFollowing(!nextFollowing);
        }
    };

    // Ensure we select the video media if multiple exist (e.g. mixed media post)
    const media = post.media?.find(m => m.media_type?.startsWith('video'));
    const baseVideoUrl = media?.view_link || media?.url;

    // Fix: Cloudinary might return .jpg for video URLs if they were used as thumbnails elsewhere.
    // We force .mp4 for the video player and .jpg for the blurred background optimization.
    const url = baseVideoUrl?.replace(/\.[^/.]+$/, ".mp4");
    const thumbnailUrl = baseVideoUrl?.replace(/\.[^/.]+$/, ".jpg");

    return (
        <div className="relative h-full w-full bg-slate-900 snap-start flex items-center justify-center overflow-hidden">
            {/* Blurred Background for immersion */}
            <div className="absolute inset-0 z-0">
                <img
                    src={thumbnailUrl}
                    className="h-full w-full object-cover blur-3xl opacity-50 scale-110"
                    alt=""
                />
            </div>

            {url ? (
                <video
                    ref={videoRef}
                    src={url}
                    className="relative z-10 max-h-full w-auto object-contain shadow-2xl"
                    loop
                    playsInline
                    muted={isMuted}
                    onClick={handleLike} // Double tap could be implemented here too
                    crossOrigin="anonymous"
                />
            ) : (
                <div className="relative z-10 flex items-center justify-center text-white/50">
                    <p>Video unavailable</p>
                </div>
            )}

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
            <div className="absolute left-0 right-16 bottom-0 p-6 z-20">
                <div className="flex items-center gap-3 mb-4">
                    <img
                        src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.username}`}
                        className="size-10 rounded-full border-2 border-white cursor-pointer"
                        alt=""
                        onClick={() => post.author?.username && navigate(`/profile/${post.author?.username}`)}
                    />
                    <span className="text-white font-bold text-lg cursor-pointer" onClick={() => post.author?.username && navigate(`/profile/${post.author?.username}`)}>
                        @{post.author?.username}
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
                <p className="text-white text-sm mb-4 line-clamp-2 max-w-md">
                    {post.caption}
                </p>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                    <Music2 className="size-4 animate-spin-slow" />
                    <span className="truncate">Original Audio - {post.author?.username}</span>
                </div>
            </div>
        </div>
    );
};

const Shorts = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const [selectedPost, setSelectedPost] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchShorts = async () => {
            try {
                // Try fetching timeline first
                const res = await axios.get('/feed/timeline?limit=20');
                let videoPosts = res.data.filter(p =>
                    p.media?.some(m => m.media_type?.startsWith('video'))
                );

                // Fallback to discovery if timeline is empty
                if (videoPosts.length === 0) {
                    const exploreRes = await axios.get('/discovery/explore?type=video&limit=20');
                    videoPosts = exploreRes.data;
                }

                // Randomize for fresh experience but deduplicate
                const uniquePosts = [];
                const seenIds = new Set();

                // Sort by date descending to show newer videos first
                const sortedVideos = [...videoPosts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                sortedVideos.forEach(p => {
                    const pid = p.id || p._id;
                    if (!seenIds.has(pid)) {
                        seenIds.add(pid);
                        uniquePosts.push(p);
                    }
                });

                setPosts(uniquePosts);
            } catch (err) {
                console.error('Failed to fetch shorts', err);
            } finally {
                setLoading(false);
            }
        };
        fetchShorts();
    }, []);

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
                {posts.length > 0 ? (
                    posts.map((post, idx) => (
                        <ShortCard
                            key={post.id || post._id}
                            post={post}
                            isActive={idx === activeIndex}
                            onComment={() => setSelectedPost(post)}
                        />
                    ))
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
