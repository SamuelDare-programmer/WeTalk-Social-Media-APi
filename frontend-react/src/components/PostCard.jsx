import React, { useState } from 'react';
import { Heart, MessageCircle, Repeat, Bookmark, MoreHorizontal, MapPin, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MediaRenderer from './MediaRenderer';
import { getTimeAgo, formatCaptionWithHashtags } from '../utils/formatters';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const PostCard = ({ post, onLike, onComment, onShare, onBookmark, onDelete }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [showHeartPop, setShowHeartPop] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const author = post.author || {};
    const authorName = `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.username || 'Unknown';
    const authorAvatar = author.avatar_url || `https://ui-avatars.com/api/?name=${author.username || 'user'}&background=random`;

    const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked);

    const isOwner = user && (post.owner_id === (user.id || user._id));

    const handleLike = async () => {
        const nextIsLiked = !isLiked;
        setIsLiked(nextIsLiked);
        setLikesCount(prev => nextIsLiked ? prev + 1 : prev - 1);

        try {
            if (nextIsLiked) {
                await axios.post(`/posts/${post.id || post._id}/likes`);
            } else {
                await axios.delete(`/posts/${post.id || post._id}/likes`);
            }
            onLike?.(post.id, nextIsLiked);
        } catch (err) {
            console.error('Like failed', err);
            // Revert state on failure
            setIsLiked(!nextIsLiked);
            setLikesCount(prev => !nextIsLiked ? prev + 1 : prev - 1);
        }
    };

    const handleBookmark = async () => {
        const nextIsBookmarked = !isBookmarked;
        setIsBookmarked(nextIsBookmarked);

        try {
            if (nextIsBookmarked) {
                await axios.post(`/posts/${post.id || post._id}/bookmark`);
            } else {
                await axios.delete(`/posts/${post.id || post._id}/bookmark`);
            }
            onBookmark?.(post.id, nextIsBookmarked);
        } catch (err) {
            console.error('Bookmark failed', err);
            setIsBookmarked(!nextIsBookmarked);
        }
    };

    const handleShare = async () => {
        if (!window.confirm("Repost this content?")) return;
        try {
            const res = await axios.post(`/posts/${post.id || post._id}/share`, {});
            if (res.status === 201) {
                alert("Reposted successfully!");
                onShare?.(post.id);
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    };

    const handleDoubleTap = () => {
        if (!isLiked) {
            handleLike();
        }
        setShowHeartPop(true);
        setTimeout(() => setShowHeartPop(false), 800);
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/posts/${post.id || post._id}`);
            onDelete?.(post.id || post._id);
        } catch (err) {
            console.error('Delete failed', err);
        } finally {
            setShowDeleteModal(false);
        }
    };

    return (
        <article className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark p-4 shadow-sm group transition-all hover:shadow-md mb-4">
            <div className="flex gap-3">
                {/* Author Avatar */}
                <div className="size-10 rounded-full border border-slate-100 dark:border-border-dark cursor-pointer overflow-hidden shrink-0" onClick={() => navigate?.(`/profile/${author.username}`)}>
                    <img src={authorAvatar} alt={author.username} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm hover:underline cursor-pointer" onClick={() => navigate?.(`/profile/${author.username}`)}>
                                {authorName}
                            </h4>
                            <p className="text-xs text-text-secondary">@{author.username}</p>
                            {post.location && (
                                <div
                                    className="flex items-center gap-1 text-xs text-primary mt-0.5 cursor-pointer hover:underline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate?.(`/explore?query=${post.location._id || post.location.id}&type=location`);
                                    }}
                                >
                                    <MapPin className="size-3" />
                                    <span>{post.location.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary">{getTimeAgo(post.created_at)}</span>
                            {isOwner ? (
                                <button
                                    onClick={handleDeleteClick}
                                    className="text-text-secondary hover:text-red-500 transition-colors"
                                    title="Delete Post"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            ) : (
                                <button className="text-text-secondary hover:text-slate-900 dark:hover:text-white">
                                    <MoreHorizontal className="size-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Caption */}
                    <div className="text-slate-800 dark:text-gray-200 text-sm mt-2 whitespace-pre-wrap">
                        {formatCaptionWithHashtags(post.caption || post.content).map((part) => (
                            part.type === 'text' ? part.text :
                                <span key={part.key} className="text-primary font-medium cursor-pointer hover:underline">
                                    {part.text}
                                </span>
                        ))}
                    </div>

                    {/* Media */}
                    <div className="relative mt-3">
                        <MediaRenderer
                            media={post.media}
                            postId={post.id || post._id}
                            onDoubleTap={handleDoubleTap}
                        />

                        {/* Heart Pop Animation */}
                        {showHeartPop && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in zoom-in duration-300">
                                <Heart className="text-white fill-white size-24 drop-shadow-2xl" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactions */}
            <div className="flex items-center justify-between mt-4 pt-1 border-t border-slate-100 dark:border-border-dark">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10'}`}
                    >
                        <Heart className={`size-6 transition-transform group-active:scale-125 ${isLiked ? 'fill-current' : ''}`} />
                        <span className="text-xs font-bold">{likesCount}</span>
                    </button>

                    <button
                        onClick={() => onComment?.(post.id || post._id)}
                        className="flex items-center gap-2 p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
                    >
                        <MessageCircle className="size-6 transition-transform group-active:scale-110" />
                        <span className="text-xs font-bold">{post.comments_count || 0}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 p-2 rounded-xl text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all"
                    >
                        <Repeat className="size-6 transition-transform group-active:scale-110" />
                        <span className="text-xs font-bold">{post.share_count || 0}</span>
                    </button>
                </div>

                <button
                    onClick={handleBookmark}
                    className={`p-2 rounded-xl transition-all ${isBookmarked ? 'text-yellow-500' : 'text-slate-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'}`}
                >
                    <Bookmark className={`size-6 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 cursor-default"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteModal(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-white/10 p-6 text-center"
                        >
                            <div className="mx-auto size-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="size-6 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Post?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                Are you sure you want to delete this post? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </article>
    );
};

export default PostCard;
