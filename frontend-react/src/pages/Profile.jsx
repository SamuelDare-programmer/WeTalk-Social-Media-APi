import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { Loader2, Edit, UserPlus, UserCheck, Mail, Grid, Play, Heart, Bookmark, X, ChevronLeft, ChevronRight } from 'lucide-react';
import PostDetailModal from '../components/PostDetailModal';
import { AnimatePresence, motion } from 'framer-motion';

const Profile = () => {
    const { username: paramUsername } = useParams();
    const { user: currentUser } = useAuth();
    // Default to current user if no param, or if param matches current user
    const username = paramUsername || currentUser?.username;

    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [media, setMedia] = useState([]);
    const [likedPosts, setLikedPosts] = useState([]);
    const [savedPosts, setSavedPosts] = useState([]);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [selectedPost, setSelectedPost] = useState(null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const navigate = useNavigate();

    const isOwner = currentUser?.username === username;

    useEffect(() => {
        if (!username) return;
        if (username === 'undefined') {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            try {
                let userRes;
                if (!paramUsername || (currentUser && paramUsername === currentUser.username)) {
                    userRes = await axios.get('/auth/users/me');
                } else {
                    userRes = await axios.get(`/auth/users/${username}`);
                }
                setProfileUser(userRes.data);

                // Check follow status if not owner
                if (currentUser && userRes.data.username !== currentUser.username) {
                    try {
                        const searchRes = await axios.get(`/discovery/search?q=${userRes.data.username}&type=user`);
                        const foundUser = searchRes.data.find(u => u.username === userRes.data.username);
                        if (foundUser) setIsFollowing(foundUser.is_following);
                    } catch (e) {
                        console.error("Failed to check follow status", e);
                    }
                }

                const postsRes = await axios.get(`/posts/user/${userRes.data.id || userRes.data._id}?limit=20`);
                // Deduplicate posts
                const uniquePosts = [];
                const seenIds = new Set();
                if (Array.isArray(postsRes.data)) {
                    postsRes.data.forEach(p => {
                        const pid = p.id || p._id;
                        if (!seenIds.has(pid)) {
                            seenIds.add(pid);
                            uniquePosts.push(p);
                        }
                    });
                }
                setPosts(uniquePosts);
            } catch (err) {
                console.error('Failed to fetch profile', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    const handleFollow = async () => {
        if (!profileUser) return;

        const prevIsFollowing = isFollowing;
        const targetUsername = profileUser._id;

        // Optimistic Update
        setIsFollowing(!prevIsFollowing);
        setProfileUser(prev => ({
            ...prev,
            followers_count: prevIsFollowing ? (prev.followers_count - 1) : (prev.followers_count + 1)
        }));

        try {
            if (prevIsFollowing) {
                await axios.post(`/users/${targetUsername}/unfollow`);
            } else {
                await axios.post(`/users/${targetUsername}/follow`);
            }
        } catch (err) {
            console.error('Follow action failed', err);
            setIsFollowing(prevIsFollowing);
            setProfileUser(prev => ({
                ...prev,
                followers_count: prevIsFollowing ? (prev.followers_count + 1) : (prev.followers_count - 1)
            }));
        }
    };

    const handleMessage = async () => {
        if (!profileUser) return;
        try {
            const res = await axios.post('/conversations/', {
                participant_ids: [profileUser.id || profileUser._id]
            });
            navigate('/messages', { state: { openChatId: res.data._id } });
        } catch (err) {
            console.error('Failed to start conversation', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'media' && media.length === 0 && profileUser) {
            const fetchMedia = async () => {
                try {
                    const res = await axios.get(`/posts/media/user/${profileUser.id || profileUser._id}`);
                    setMedia(res.data);
                } catch (err) {
                    console.error('Failed to fetch media', err);
                }
            };
            fetchMedia();
        }
    }, [activeTab, profileUser, media.length]);

    useEffect(() => {
        if (activeTab === 'likes' && likedPosts.length === 0 && profileUser) {
            const fetchLikedPosts = async () => {
                try {
                    const res = await axios.get(`/posts/user/${profileUser.id || profileUser._id}/likes`);
                    setLikedPosts(res.data);
                } catch (err) {
                    console.error('Failed to fetch liked posts', err);
                }
            };
            fetchLikedPosts();
        }
    }, [activeTab, profileUser, likedPosts.length]);

    useEffect(() => {
        if (activeTab === 'saved' && savedPosts.length === 0 && isOwner) {
            const fetchSavedPosts = async () => {
                try {
                    const res = await axios.get('/posts/bookmarks');
                    setSavedPosts(res.data);
                } catch (err) {
                    console.error('Failed to fetch saved posts', err);
                }
            };
            fetchSavedPosts();
        }
    }, [activeTab, isOwner, savedPosts.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedMediaIndex === null) return;
            if (e.key === 'Escape') setSelectedMediaIndex(null);
            if (e.key === 'ArrowRight') setSelectedMediaIndex((prev) => (prev + 1) % media.length);
            if (e.key === 'ArrowLeft') setSelectedMediaIndex((prev) => (prev - 1 + media.length) % media.length);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedMediaIndex, media.length]);

    const handleDeletePost = (postId) => {
        setPosts(prev => prev.filter(p => (p.id || p._id) !== postId));
    };

    if (loading && !profileUser) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="size-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User not found</h2>
                <button onClick={() => navigate('/')} className="text-primary hover:underline mt-4">Go home</button>
            </div>
        );
    }

    return (
        <div className="max-w-[800px] mx-auto animate-in fade-in duration-500">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12">
                <div
                    onClick={() => setShowAvatarModal(true)}
                    className="size-32 md:size-40 rounded-full border-4 border-white dark:border-surface-dark overflow-hidden shadow-xl shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                >
                    <img
                        src={profileUser.avatar_url || `https://ui-avatars.com/api/?name=${profileUser.username}`}
                        alt={profileUser.username}
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {profileUser.first_name || profileUser.username} {profileUser.last_name || ''}
                        </h2>
                        <div className="flex gap-2 justify-center md:justify-start">
                            {isOwner ? (
                                <button
                                    onClick={() => navigate('/edit-profile')}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-border-dark rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-900 dark:text-white"
                                >
                                    <Edit className="size-4" /> Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleFollow}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-md ${isFollowing
                                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                                            : 'bg-primary text-white hover:bg-indigo-600 shadow-primary/20'}`}
                                    >
                                        {isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    <button
                                        onClick={handleMessage}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-border-dark rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-900 dark:text-white"
                                    >
                                        <Mail className="size-4" /> Message
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center md:justify-start gap-8 mb-6">
                        <div className="text-sm"><span className="font-bold">{posts.length}</span> <span className="text-text-secondary">posts</span></div>
                        <div
                            className="text-sm cursor-pointer hover:underline text-slate-900 dark:text-white"
                            onClick={() => isOwner && navigate('/relationships', { state: { tab: 'followers' } })}
                        >
                            <span className="font-bold">{profileUser.followers_count || 0}</span> <span className="text-text-secondary">followers</span>
                        </div>
                        <div
                            className="text-sm cursor-pointer hover:underline text-slate-900 dark:text-white"
                            onClick={() => isOwner && navigate('/relationships', { state: { tab: 'following' } })}
                        >
                            <span className="font-bold">{profileUser.following_count || 0}</span> <span className="text-text-secondary">following</span>
                        </div>
                    </div>

                    <p className="text-slate-800 dark:text-gray-200 whitespace-pre-wrap max-w-md text-sm">
                        {profileUser.bio || "No bio yet."}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-4 md:gap-16 border-t border-slate-200 dark:border-border-dark mb-8">
                {[
                    { id: 'posts', icon: Grid, label: 'POSTS' },
                    { id: 'media', icon: Play, label: 'MEDIA' },
                    { id: 'likes', icon: Heart, label: 'LIKES' },
                    ...(isOwner ? [{ id: 'saved', icon: Bookmark, label: 'SAVED' }] : [])
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 py-4 border-t-2 transition-all text-[11px] font-bold tracking-widest ${activeTab === tab.id
                            ? 'border-slate-800 dark:border-white text-slate-900 dark:text-white'
                            : 'border-transparent text-text-secondary hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <tab.icon className="size-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Posts List */}
            <div className="max-w-[650px] mx-auto">
                {activeTab === 'posts' && (
                    <>
                        {posts.map((post) => (
                            <PostCard
                                key={post.id || post._id}
                                post={post}
                                onComment={() => setSelectedPost(post)}
                                onDelete={handleDeletePost}
                                onMediaClick={setSelectedPost}
                            />
                        ))}

                        {posts.length === 0 && (
                            <div className="text-center py-20 text-text-secondary">
                                No posts yet.
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'media' && (
                    <div className="grid grid-cols-3 gap-1 md:gap-4">
                        {media.map((item, index) => (
                            <div
                                key={item._id || item.id}
                                onClick={() => setSelectedMediaIndex(index)}
                                className="aspect-square bg-slate-100 dark:bg-white/5 overflow-hidden rounded-lg relative group cursor-pointer"
                            >
                                {item.media_type?.startsWith('video') ? (
                                    <video src={item.view_link} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={item.view_link} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>
                        ))}
                        {media.length === 0 && (
                            <div className="col-span-3 text-center py-20 text-text-secondary">
                                No media found.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'likes' && (
                    <>
                        {likedPosts.map((post) => (
                            <PostCard
                                key={post.id || post._id}
                                post={post}
                                onComment={() => setSelectedPost(post)}
                                onMediaClick={setSelectedPost}
                            />
                        ))}

                        {likedPosts.length === 0 && (
                            <div className="text-center py-20 text-text-secondary">
                                No liked posts yet.
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'saved' && (
                    <>
                        {savedPosts.map((post) => (
                            <PostCard
                                key={post.id || post._id}
                                post={post}
                                onComment={() => setSelectedPost(post)}
                                onMediaClick={setSelectedPost}
                            />
                        ))}

                        {savedPosts.length === 0 && (
                            <div className="text-center py-20 text-text-secondary">
                                No saved posts yet.
                            </div>
                        )}
                    </>
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

            {/* Avatar Modal */}
            <AnimatePresence>
                {showAvatarModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center backdrop-blur-sm p-4"
                        onClick={() => setShowAvatarModal(false)}
                    >
                        <button
                            onClick={() => setShowAvatarModal(false)}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
                        >
                            <X className="size-8" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={profileUser.avatar_url || `https://ui-avatars.com/api/?name=${profileUser.username}`}
                            className="max-w-full max-h-[80vh] aspect-square rounded-full object-cover shadow-2xl border-4 border-white dark:border-slate-800"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Media Lightbox */}
            <AnimatePresence>
                {selectedMediaIndex !== null && media[selectedMediaIndex] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center backdrop-blur-sm"
                        onClick={() => setSelectedMediaIndex(null)}
                    >
                        <button
                            onClick={() => setSelectedMediaIndex(null)}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
                        >
                            <X className="size-8" />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex((prev) => (prev - 1 + media.length) % media.length); }}
                            className="absolute left-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50 hidden md:block"
                        >
                            <ChevronLeft className="size-10" />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex((prev) => (prev + 1) % media.length); }}
                            className="absolute right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50 hidden md:block"
                        >
                            <ChevronRight className="size-10" />
                        </button>

                        <div
                            className="w-full h-full max-w-5xl max-h-[90vh] p-4 flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {media[selectedMediaIndex].media_type?.startsWith('video') ? (
                                <video
                                    src={media[selectedMediaIndex].view_link}
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                    controls
                                    autoPlay
                                />
                            ) : (
                                <img
                                    src={media[selectedMediaIndex].view_link}
                                    className="max-w-full max-h-full object-contain shadow-2xl"
                                    alt=""
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
