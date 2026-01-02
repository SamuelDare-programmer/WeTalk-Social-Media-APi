import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Bookmark, Send, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MediaRenderer from './MediaRenderer';
import { formatDistanceToNow } from 'date-fns';

const PostDetailModal = ({ post, onClose, onLike, onBookmark }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);
    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [isBookmarked, setIsBookmarked] = useState(post.is_bookmarked);

    const postId = post.id || post._id;
    const author = post.author || {};

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
            // Add new comment to state optimistically or from response
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
                    <div className="max-h-[50vh] md:max-h-full w-full h-full flex items-center justify-center">
                        {(!post.media || post.media.length === 0) ? (
                            <div className="w-full h-full min-h-[400px] flex items-center justify-center p-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white text-center font-bold text-2xl">
                                {post.caption}
                            </div>
                        ) : (
                            <MediaRenderer media={post.media} postId={postId} />
                        )}
                    </div>
                </div>

                {/* Right: Details & Comments */}
                <div className="w-full md:w-[40%] flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3">
                            <img
                                src={author.avatar_url || `https://ui-avatars.com/api/?name=${author.username}`}
                                className="size-10 rounded-full border border-slate-200 dark:border-slate-700"
                                alt=""
                            />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm hover:underline cursor-pointer">
                                    {author.username}
                                </h4>
                                <p className="text-xs text-slate-500">{author.bio?.substring(0, 30) || 'Verified User'}</p>
                            </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <MoreHorizontal className="size-5" />
                        </button>
                    </div>

                    {/* Scrollable Content (Caption + Comments) */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {/* Caption */}
                        {post.caption && (post.media && post.media.length > 0) && (
                            <div className="mb-6">
                                <span className="text-slate-800 dark:text-slate-300 text-sm whitespace-pre-wrap">{post.caption}</span>
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
                                                <span className="font-bold mr-2 text-slate-900 dark:text-white">{comment.author?.username}</span>
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
        </motion.div>
    );
};

export default PostDetailModal;
