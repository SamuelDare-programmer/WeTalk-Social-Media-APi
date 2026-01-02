import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const SuggestedUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await axios.get('/discovery/suggestions?limit=5');
                // Only take the first 3 users to save space
                setUsers(res.data.slice(0, 3));
            } catch (err) {
                console.error('Failed to fetch suggestions', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    const handleFollow = async (user, e) => {
        e.stopPropagation();
        try {
            await axios.post(`/users/${user.id}/follow`);
            // Update local state to show 'Following'
            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_following: true } : u
            ));
        } catch (err) {
            console.error('Follow failed', err);
        }
    };

    if (loading) return null;
    if (users.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-text-secondary">Suggested for you</span>
                <button className="text-[11px] font-bold dark:text-white hover:opacity-70">See All</button>
            </div>

            <div className="space-y-3">
                {users.map(user => (
                    <div
                        key={user.id}
                        className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer group"
                        onClick={() => navigate(`/profile/${user.username}`)}
                    >
                        <img
                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                            className="size-9 rounded-full object-cover border border-slate-100 dark:border-white/5"
                            alt=""
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black dark:text-white truncate group-hover:underline">{user.username}</p>
                            <p className="text-[10px] text-text-secondary truncate">{user.followers_count || 0} followers</p>
                        </div>
                        <button
                            onClick={(e) => handleFollow(user, e)}
                            className={`text-xs font-bold px-2 py-1 transition-colors ${user.is_following
                                ? 'text-green-500 hover:text-green-600'
                                : 'text-primary hover:text-indigo-400'
                                }`}
                        >
                            {user.is_following ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuggestedUsers;
