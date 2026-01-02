import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import PostCard from '../components/PostCard';
import StoryTray from '../components/StoryTray';
import StoryViewer from '../components/StoryViewer';
import SuggestedUsers from '../components/SuggestedUsers';
import TrendingHashtags from '../components/TrendingHashtags';
import CreateFAB from '../components/CreateFAB';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import PostDetailModal from '../components/PostDetailModal';
import { AnimatePresence } from 'framer-motion';

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [activeStoryGroups, setActiveStoryGroups] = useState(null);
    const [initialStoryIndex, setInitialStoryIndex] = useState(0);
    const [selectedPost, setSelectedPost] = useState(null);
    const { user } = useAuth();

    const fetchPosts = async (isInitial = false) => {
        try {
            const currentOffset = isInitial ? 0 : offset;
            const res = await axios.get(`/posts/?limit=10&offset=${currentOffset}`);
            const newPosts = res.data;

            if (isInitial) {
                setPosts(newPosts);
            } else {
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
            }

            setHasMore(newPosts.length === 10);
            setOffset(currentOffset + newPosts.length);
        } catch (err) {
            console.error('Failed to fetch posts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts(true);
    }, []);

    const handleStoryClick = async (groups, index) => {
        setActiveStoryGroups(groups);
        setInitialStoryIndex(index);
    };

    if (loading && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="size-10 text-primary animate-spin" />
                <p className="text-text-secondary mt-4">Loading your feed...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1100px] mx-auto px-4 py-8 flex gap-8">
            <div className="flex-1 max-w-[650px] space-y-8">
                {/* Feed Toggle */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
                    <button
                        className="flex-1 py-1.5 text-sm font-bold bg-white dark:bg-surface-dark shadow-sm rounded-lg transition-all text-slate-900 dark:text-white"
                    >
                        For You
                    </button>
                    <Link
                        to="/timeline"
                        className="flex-1 py-1.5 text-sm font-bold text-text-secondary hover:text-slate-900 dark:hover:text-white transition-all text-center"
                    >
                        Following
                    </Link>
                </div>

                <StoryTray onStoryClick={handleStoryClick} />

                <div className="flex flex-col gap-6">
                    {posts.map((post) => (
                        <PostCard
                            key={post.id || post._id}
                            post={post}
                            onComment={() => setSelectedPost(post)}
                        />
                    ))}
                </div>

                {hasMore && (
                    <div className="py-10 flex justify-center">
                        <button
                            onClick={() => fetchPosts()}
                            className="px-6 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                            Load More
                        </button>
                    </div>
                )}

                {posts.length === 0 && !loading && (
                    <div className="text-center py-20 text-text-secondary">
                        No posts yet. Follow people to see their posts!
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block w-[320px] space-y-10 sticky top-24 h-fit">
                {/* User Info */}
                <div className="flex items-center gap-3 px-2">
                    <img
                        src={user?.avatar_url || user?.profile_image || `https://ui-avatars.com/api/?name=${user?.username}`}
                        className="size-12 rounded-full border-2 border-primary/20 p-0.5 object-cover"
                        alt=""
                    />
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm dark:text-white truncate">{user?.first_name} {user?.last_name}</p>
                        <p className="text-xs text-text-secondary truncate">@{user?.username}</p>
                    </div>
                    <Link to="/profile" className="text-xs font-bold text-primary hover:text-indigo-400">Profile</Link>
                </div>

                <SuggestedUsers />
                <TrendingHashtags />

                <div className="px-2 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-secondary/60">
                        {['About', 'Help', 'Press', 'API', 'Privacy', 'Terms'].map(link => (
                            <a key={link} href="#" className="hover:underline">{link}</a>
                        ))}
                    </div>
                    <p className="text-[11px] text-text-secondary/60 mt-6 uppercase font-black">© 2025 WETALK FROM PIXSELLS</p>
                </div>
            </aside>

            <CreateFAB />

            {activeStoryGroups && (
                <StoryViewer
                    storyGroups={activeStoryGroups}
                    initialGroupIndex={initialStoryIndex}
                    onClose={() => setActiveStoryGroups(null)}
                />
            )}

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

export default Home;
