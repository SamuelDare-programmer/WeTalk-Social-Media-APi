import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Search, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PostDetailModal from '../components/PostDetailModal';
import { AnimatePresence } from 'framer-motion';

const Explore = () => {
    const [selectedPost, setSelectedPost] = useState(null);
    const location = useLocation();

    // Parse Query Params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const queryParam = params.get('query');
        const catParam = params.get('cat');
        if (queryParam) setSearchQuery(queryParam);
        if (catParam && categories.includes(catParam)) setActiveCategory(catParam);
    }, [location.search]);


    const fetchExplore = useCallback(async (offset, limit) => {
        let endpoint = `/discovery/explore?limit=${limit}&offset=${offset}`;

        // Dynamic Endpoint Construction
        if (isPlaceSearch && searchQuery) {
            endpoint = `/discovery/search?q=${encodeURIComponent(searchQuery)}&type=place&limit=${limit}`;
            // Search usually doesn't stick to strict offset unless supported. 
            // We'll trust the hook to handle what it gets.
        }
        else if (searchQuery) {
            if (searchQuery.startsWith('#')) {
                endpoint = `/discovery/tags/${searchQuery.replace('#', '')}?limit=${limit}&offset=${offset}`;
            } else {
                endpoint = `/discovery/search?q=${encodeURIComponent(searchQuery)}&type=user&limit=${limit}`;
            }
        }
        else {
            // Category Filters
            if (activeCategory === 'Pictures') endpoint += '&type=image';
            else if (activeCategory === 'Videos') endpoint += '&type=video';
            // For simplicity, 'All' goes to default explore.
        }

        const res = await axios.get(endpoint);
        let data = res.data;
        if (!searchQuery && Array.isArray(data)) {
            data = data.filter(post => post.media && post.media.length > 0);
        }
        return data;
    }, [searchQuery, activeCategory, isPlaceSearch]);

    const {
        items: posts,
        loading,
        lastElementRef,
        reset
    } = useInfiniteScroll(fetchExplore, { limit: 30 });

    // Reset list when filters change
    useEffect(() => {
        reset();
    }, [searchQuery, activeCategory, reset]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Search Header */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="relative group max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search for users, hashtags, or topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                navigate(`/explore?query=${encodeURIComponent(searchQuery)}&cat=${activeCategory}`);
                            }
                        }}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                setActiveCategory(cat);
                                if (searchQuery) {
                                    navigate(`/explore?query=${encodeURIComponent(searchQuery)}&cat=${cat}`);
                                }
                            }}
                            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${activeCategory === cat
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-border-dark text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="size-10 text-primary animate-spin" />
                    <p className="text-text-secondary mt-4">Curating content for you...</p>
                </div>
            ) : isPlaceSearch ? (
                // Location List View
                <div className="flex flex-col gap-2">
                    {posts.length === 0 && <p className="text-center text-slate-500 py-10">No places found.</p>}
                    {posts.map((place) => (
                        <div
                            key={place._id}
                            onClick={() => navigate(`/explore?query=${place._id}&type=location`)}
                            className="flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 transition-colors border border-slate-100 dark:border-white/5"
                        >
                            <div className="size-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                                <Search className="size-5 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">{place.name}</h3>
                                <p className="text-sm text-slate-500">{place.address}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Standard Grid View
                <div className="grid grid-cols-3 gap-0.5 sm:gap-4 px-0.5 sm:px-0">
                    {posts.map((post, idx) => {
                        const postId = post.id || post._id;
                        const isLarge = idx % 10 === 0 || idx % 10 === 6;
                        const isLast = posts.length === idx + 1;
                        const media = post.media?.[0];
                        const isVideo = media?.media_type?.startsWith('video');
                        // Use thumbnail for grid, optimized fallback for raw display
                        const url = media?.thumbnail_url || media?.view_link || media?.url;

                        return (
                            <div
                                key={postId}
                                ref={isLast ? lastElementRef : null}
                                className={`relative group overflow-hidden cursor-pointer sm:rounded-xl transition-all hover:z-10 ${isLarge ? 'md:row-span-2 md:col-span-1' : ''
                                    } ${!url ? 'aspect-square bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500' : 'bg-slate-100 dark:bg-white/5 shadow-sm'}`}
                                onClick={() => setSelectedPost(post)}
                            >
                                {url ? (
                                    <>
                                        {isVideo ? (
                                            <div className="w-full h-full relative">
                                                <img
                                                    src={url}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                                <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white">
                                                    <svg className="size-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <img
                                                src={url}
                                                alt=""
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${post.author?.username || 'P'}&background=random`; }}
                                            />
                                        )}
                                    </>
                                ) : (
                                    /* Glassmorphic Text Post */
                                    <div className="w-full h-full p-6 flex items-center justify-center text-center relative">
                                        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 m-4 rounded-xl shadow-2xl" />
                                        <p className="relative z-10 text-white font-black text-sm lg:text-base line-clamp-4 drop-shadow-lg">
                                            {post.caption || post.content}
                                        </p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white z-20">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                        {post.likes_count || 0}
                                    </div>
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <svg className="size-5 fill-current" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                                        {post.comments_count || 0}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
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

export default Explore;
