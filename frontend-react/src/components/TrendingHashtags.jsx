import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { TrendingUp } from 'lucide-react';

const TrendingHashtags = () => {
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTrends = async () => {
            try {
                const res = await axios.get('/discovery/trending');
                if (Array.isArray(res.data)) {
                    setTrends(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch trending tags', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <div className="h-4 w-4 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                </div>
                <div className="space-y-3 px-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                            <div className="h-2 w-12 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <TrendingUp className="size-4 text-text-secondary" />
                <span className="text-sm font-bold text-text-secondary">Trending Now</span>
            </div>

            {trends.length === 0 ? (
                <div className="px-2 text-xs text-text-secondary">
                    No trending hashtags right now.
                </div>
            ) : (
                <div className="space-y-3">
                    {trends.slice(0, 5).map((trend, idx) => (
                        <div
                            key={idx}
                            className="px-2 group cursor-pointer"
                            onClick={() => navigate(`/explore?query=%23${(trend.name || trend.hashtag).replace('#', '')}`)}
                        >
                            <p className="text-xs font-black dark:text-white group-hover:underline">
                                #{(trend.name || trend.hashtag).replace('#', '')}
                            </p>
                            <p className="text-[10px] text-text-secondary mt-0.5">
                                {trend.post_count || trend.count || 0} posts
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TrendingHashtags;
