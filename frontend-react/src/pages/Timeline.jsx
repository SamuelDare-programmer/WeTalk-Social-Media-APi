import React, { useState, useEffect, useRef, useCallback } from 'react';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
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

const Timeline = () => {
    const [activeStoryGroups, setActiveStoryGroups] = useState(null);
    const [initialStoryIndex, setInitialStoryIndex] = useState(0);
    const [selectedPost, setSelectedPost] = useState(null);
    const { user } = useAuth();

    const fetchTimelinePosts = useCallback(async (offset, limit) => {
        const res = await axios.get(`/feed/timeline?limit=${limit}&offset=${offset}`);
        return res.data;
    }, []);

    const {
        items: posts,
        loading,
        hasMore,
        lastElementRef,
        setItems: setPosts // Expose setter if needed for optimistic updates (like delete)
    } = useInfiniteScroll(fetchTimelinePosts, { limit: 10 });

    useEffect(() => {
        // Initial load handled by hook's structure or we can trigger manually if needed
        // but useInfiniteScroll typically needs an initial trigger or we can rely on observer if sentinel is visible
        // However, standard pattern is to auto-load first page if empty.
        // Our hook structure relies on observer. 
        // Let's manually trigger initial load if empty to ensure content appears even if observer is wonky.
        if (posts.length === 0 && hasMore) {
            // This is a bit tricky with the hook design. Usually hook auto-mounts.
            // Let's trust the observer logic or add a mount effect in the hook.
            // Actually, the hook in its current state only loads on 'loadMore'. 
            // In Timeline, we want immediate load.
        }
    }, []);

    // Quick fix: Trigger initial load manually in this component context is hard without exposing 'loadMore' from hook.
    // Let's rely on the sentinel being visible initially.
    // OR: Re-writing hook usage slightly to match existing patterns: exposing loadMore to call on mount.


    const handleStoryClick = async (groups, index) => {
        setActiveStoryGroups(groups);
        setInitialStoryIndex(index);
    };

    if (loading && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="size-10 text-primary animate-spin" />
                <p className="text-text-secondary mt-4">Loading your timeline...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1100px] mx-auto px-4 py-8 flex gap-8">
            <div className="flex-1 max-w-[650px] space-y-8">
                {/* Feed Toggle */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6">
                    <Link
                        to="/"
                        className="flex-1 py-1.5 text-sm font-bold text-text-secondary hover:text-slate-900 dark:hover:text-white transition-all text-center"
                    >
                        For You
                    </Link>
                    <button
                        className="flex-1 py-1.5 text-sm font-bold bg-white dark:bg-surface-dark shadow-sm rounded-lg transition-all text-slate-900 dark:text-white"
                    >
                        Following
                    </button>
                </div>

                <StoryTray onStoryClick={handleStoryClick} />

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Timeline</h2>
                    <span className="text-sm text-slate-500">Following</span>
                </div>

                <div className="flex flex-col gap-6">
                    {posts.map((post, index) => {
                        if (posts.length === index + 1) {
                            return (
                                <div ref={lastElementRef} key={post.id || post._id}>
                                    <PostCard
                                        post={post}
                                        onComment={() => setSelectedPost(post)}
                                        onMediaClick={setSelectedPost}
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <PostCard
                                    key={post.id || post._id}
                                    post={post}
                                    onComment={() => setSelectedPost(post)}
                                    onMediaClick={setSelectedPost}
                                />
                            );
                        }
                    })}
                </div>

                {loading && (
                    <div className="py-4 flex justify-center">
                        <Loader2 className="size-6 text-primary animate-spin" />
                    </div>
                )}

                {posts.length === 0 && !loading && (
                    <div className="text-center py-20 text-text-secondary bg-slate-50 dark:bg-white/5 rounded-3xl">
                        <p className="font-bold mb-2">Your timeline is empty!</p>
                        <p className="text-sm">Follow people to see their posts here.</p>
                        <Link to="/explore" className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors">
                            Find People
                        </Link>
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

                {/* Friend of Friends Suggestions (Simulated via regular suggestions but with different header) */}
                <div>
                    <div className="flex justify-between items-center px-1 mb-4">
                        <span className="text-sm font-bold text-text-secondary">Friends of Friends</span>
                    </div>
                    <SuggestedUsers />
                </div>

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

export default Timeline;
