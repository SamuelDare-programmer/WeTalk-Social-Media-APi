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
                setTrends(res.data);
            } catch (err) {
                console.error('Failed to fetch trending tags', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTrends();
    }, []);

    if (loading) return null;
    if (trends.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <TrendingUp className="size-4 text-text-secondary" />
                <span className="text-sm font-bold text-text-secondary">Trending Now</span>
            </div>

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
        </div>
    );
};

export default TrendingHashtags;
