import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Bookmark, Send, MoreHorizontal, Maximize2, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MediaRenderer from './MediaRenderer';
import { formatDistanceToNow } from 'date-fns';
import { useVideo } from '../context/VideoContext';

const PostDetailModal = ({ post, onClose, onLike, onBookmark }) => {
    const { user } = useAuth();
    const { isMuted, toggleMute, playVideo } = useVideo();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);
    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const navigate = useNavigate();

    const postId = post.id || post._id;
    const author = post.author || post.user || {};
    const caption = post.caption || post.content || '';
    const username = author.username || 'unknown';
    const avatarUrl = author.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=random`;

    // Ensure we are the active video when modal opens to pause background feed
    useEffect(() => {
        if (postId) {
            playVideo(postId);
        }
    }, [postId, playVideo]);

    const getVideoUrl = (url) => {
        if (!url) return '';
        return url.replace(/\.(jpg|jpeg|png|webp)$/i, '.mp4');
    };

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const res = await axios.get(`/posts/${postId}/comments`);
                setComments(res.data);
            } catch (err) {
                console.error('Failed to fetch comments', err);
            } finally {
                setLoadingComments(false);
            }
        };
        fetchComments();
    }, [postId]);

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const res = await axios.post(`/posts/${postId}/comments`, { content: newComment });
            const addedComment = {
                ...res.data,
                author: {
                    username: user.username,
                    avatar_url: user.avatar_url
                },
                created_at: new Date().toISOString()
            };
            setComments([addedComment, ...comments]);
            setNewComment('');
        } catch (err) {
            console.error('Failed to post comment', err);
        }
    };

    const handleLike = async () => {
        const nextLiked = !isLiked;
        setIsLiked(nextLiked);
        setLikesCount(prev => nextLiked ? prev + 1 : prev - 1);
        try {
            if (nextLiked) {
                await axios.post(`/posts/${postId}/likes`);
            } else {
                await axios.delete(`/posts/${postId}/likes`);
            }
            onLike?.(postId, nextLiked);
        } catch (err) {
            console.error('Like failed', err);
            setIsLiked(!nextLiked);
            setLikesCount(prev => !nextLiked ? prev + 1 : prev - 1);
        }
    };

    const handleBookmark = async () => {
        const nextBookmarked = !isBookmarked;
        setIsBookmarked(nextBookmarked);
        try {
            if (nextBookmarked) {
                await axios.post(`/posts/${postId}/bookmark`);
            } else {
                await axios.delete(`/posts/${postId}/bookmark`);
            }
            onBookmark?.(postId, nextBookmarked);
        } catch (err) {
            console.error('Bookmark failed', err);
            setIsBookmarked(!nextBookmarked);
        }
    };

    const getPrimaryMediaUrl = () => {
        if (!post.media || post.media.length === 0) return null;
        const media = post.media[0];
        return media.view_link || media.url;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button Mobile */}
                <button onClick={onClose} className="absolute top-4 right-4 md:hidden z-20 p-2 bg-black/50 rounded-full text-white">
                    <X className="size-5" />
                </button>

                {/* Left: Media */}
                <div className="w-full md:w-[60%] bg-black flex items-center justify-center relative bg-pattern">
                    <div className="max-h-[50vh] md:max-h-full w-full h-full flex items-center justify-center relative group">
                        {(!post.media || post.media.length === 0) ? (
                            <div className="w-full h-full min-h-[400px] flex items-center justify-center p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-center font-bold text-2xl">
                                {post.caption}
                            </div>
                        ) : (
                            <>
                                <MediaRenderer
                                    media={post.media}
                                    postId={postId}
                                    showImmersiveIcon={false}
                                    forcePause={isFullscreen}
                                    initialIndex={activeIndex}
                                    onIndexChange={setActiveIndex}
                                />
                                <button
                                    onClick={() => setIsFullscreen(true)}
                                    className="absolute bottom-4 right-4 z-20 p-3 bg-black/40 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60 border border-white/10"
                                >
                                    <Maximize2 className="size-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Details & Comments */}
                <div className="w-full md:w-[40%] flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3">
                            <img
                                src={avatarUrl}
                                className="size-10 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer"
                                alt=""
                                onClick={() => { onClose(); navigate(`/profile/${username}`); }}
                            />
                            <div onClick={() => { onClose(); navigate(`/profile/${username}`); }} className="cursor-pointer">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm hover:underline">
                                    {username}
                                </h4>
                                <p className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{author.bio?.substring(0, 30) || 'Verified User'}</p>
                            </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <MoreHorizontal className="size-5" />
                        </button>
                    </div>

                    {/* Scrollable Content (Caption + Comments) */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {/* Caption */}
                        {caption && (
                            <div className="mb-6">
                                <span className="text-slate-800 dark:text-slate-300 text-sm whitespace-pre-wrap">{caption}</span>
                                <div className="text-xs text-slate-400 mt-2">{formatDistanceToNow(new Date(post.created_at))} ago</div>
                            </div>
                        )}

                        <div className="h-px bg-slate-100 dark:bg-slate-800 mb-4" />

                        {/* Comments List */}
                        {loadingComments ? (
                            <div className="text-center py-10 text-slate-400">Loading comments...</div>
                        ) : comments.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">No comments yet. Be the first!</div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <img
                                            src={comment.author?.avatar_url || `https://ui-avatars.com/api/?name=${comment.author?.username}`}
                                            className="size-8 rounded-full"
                                            alt=""
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm">
                                                <span
                                                    className="font-bold mr-2 text-slate-900 dark:text-white hover:underline cursor-pointer"
                                                    onClick={() => { onClose(); navigate(`/profile/${comment.author?.username}`); }}
                                                >
                                                    {comment.author?.username}
                                                </span>
                                                <span className="text-slate-700 dark:text-slate-300">{comment.content}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-semibold">
                                                <span>{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                                                <button className="hover:text-slate-600 dark:hover:text-slate-200">Reply</button>
                                                <button className="hover:text-slate-600 dark:hover:text-slate-200">Like</button>
                                            </div>
                                        </div>
                                        <button className="text-slate-400 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Heart className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions & Input */}
                    <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 z-10">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                <button onClick={handleLike} className={`${isLiked ? 'text-pink-500' : 'text-slate-900 dark:text-white hover:text-pink-500'}`}>
                                    <Heart className={`size-6 ${isLiked ? 'fill-current' : ''}`} />
                                </button>
                                <button className="text-slate-900 dark:text-white hover:text-blue-500">
                                    <MessageCircle className="size-6" />
                                </button>
                                <button className="text-slate-900 dark:text-white hover:text-green-500">
                                    <Share2 className="size-6" />
                                </button>
                            </div>
                            <button onClick={handleBookmark} className={`${isBookmarked ? 'text-yellow-500' : 'text-slate-900 dark:text-white hover:text-yellow-500'}`}>
                                <Bookmark className={`size-6 ${isBookmarked ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                            {likesCount} likes
                        </div>

                        <form onSubmit={handlePostComment} className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="text-primary font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:text-primary-hover"
                            >
                                Post
                            </button>
                        </form>
                    </div>
                </div>

                {/* Close Button Desktop */}
                <button
                    onClick={onClose}
                    className="absolute -right-12 top-0 hidden md:flex items-center justify-center p-2 text-white hover:text-slate-200 transition-colors"
                >
                    <X className="size-8" />
                </button>
            </motion.div>

            {/* True Immersive Fullscreen Overlay */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header/Controls */}
                        <div className="absolute top-0 inset-x-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                            <button
                                onClick={() => setIsFullscreen(false)}
                                className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                            >
                                <ChevronLeft className="size-6" />
                            </button>

                            <div className="flex items-center gap-4">
                                <button onClick={toggleMute} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10">
                                    {isMuted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
                                </button>
                            </div>
                        </div>

                        {/* Main Media - Full Screen Focus */}
                        <div className="relative z-10 w-full h-full flex items-center justify-center select-none overflow-hidden pb-4">
                            {post.media?.length > 1 && (
                                <button
                                    onClick={() => setActiveIndex((prev) => (prev - 1 + post.media.length) % post.media.length)}
                                    className="absolute left-6 z-30 p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10 active:scale-90 hidden md:flex"
                                >
                                    <ChevronLeft className="size-8" />
                                </button>
                            )}

                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(e, { offset, velocity }) => {
                                    const swipe = offset.x;
                                    if (swipe < -100) {
                                        setActiveIndex((prev) => (prev + 1) % post.media.length);
                                    } else if (swipe > 100) {
                                        setActiveIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
                                    }
                                }}
                                className="w-full h-full flex items-center justify-center p-2 md:p-8 cursor-grab active:cursor-grabbing"
                            >
                                {post.media?.[activeIndex]?.media_type?.startsWith('video') ? (
                                    <video
                                        key={`full-${postId}-${activeIndex}`}
                                        controls
                                        autoPlay
                                        name="media"
                                        className="w-full h-full object-contain pointer-events-auto"
                                        src={getVideoUrl(post.media[activeIndex].view_link || post.media[activeIndex].url)}
                                        muted={isMuted}
                                        playsInline
                                    >
                                        <source src={getVideoUrl(post.media[activeIndex].view_link || post.media[activeIndex].url)} type="video/mp4" />
                                    </video>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                                        <img
                                            key={`full-${postId}-${activeIndex}`}
                                            src={post.media?.[activeIndex]?.view_link || post.media?.[activeIndex]?.url}
                                            alt="Immersive content"
                                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                                            draggable="false"
                                        />
                                    </div>
                                )}
                            </motion.div>

                            {post.media?.length > 1 && (
                                <button
                                    onClick={() => setActiveIndex((prev) => (prev + 1) % post.media.length)}
                                    className="absolute right-6 z-30 p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10 active:scale-90 hidden md:flex"
                                >
                                    <ChevronRight className="size-8" />
                                </button>
                            )}

                            {/* Mobile Swipe Indicators */}
                            {post.media?.length > 1 && (
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                                    {post.media.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`size-1.5 rounded-full transition-all ${i === activeIndex ? 'bg-white w-4' : 'bg-white/30'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PostDetailModal;
