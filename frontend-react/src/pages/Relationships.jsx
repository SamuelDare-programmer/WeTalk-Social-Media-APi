import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, UserPlus, UserCheck, UserX, Shield, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const RELATIONSHIP_TABS = [
    { id: 'followers', label: 'Followers', icon: UserCheck },
    { id: 'following', label: 'Following', icon: UserPlus },
    { id: 'requests', label: 'Requests', icon: UserPlus },
    { id: 'blocked', label: 'Blocked', icon: Shield },
];

const Relationships = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const location = useLocation();

    // Initialize activeTab from navigation state or default to 'followers'
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'followers');

    const fetchData = async () => {
        setLoading(true);
        try {
            let endpoint = '';
            switch (activeTab) {
                case 'followers':
                    endpoint = `/users/${user.id || user._id}/followers`;
                    break;
                case 'following':
                    endpoint = `/users/${user.id || user._id}/following`;
                    break;
                case 'requests':
                    endpoint = `/users/requests/pending`;
                    break;
                case 'blocked':
                    // Need to verify if this endpoint exists, for now simulating or placeholder
                    // Assuming a standard endpoint or we might need to create it
                    endpoint = null; // To be implemented or confirmed
                    break;
                default:
                    return;
            }

            if (endpoint) {
                const res = await axios.get(endpoint);
                // Handle Pydantic response format { items: [], next_cursor: ... }
                const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
                setData(items);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(`Failed to fetch ${activeTab}`, err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, user]);

    const handleAction = async (targetId, action) => {
        try {
            if (activeTab === 'requests') {
                await axios.post(`/users/requests/${targetId}/action`, { action }); // accept / decline
            } else if (activeTab === 'following') {
                await axios.delete(`/users/${targetId}/follow`); // Verify unmount logic
            } else if (activeTab === 'followers') {
                // Remove follower - typically block/unblock or specific endpoint
                // For now, let's assume blocking removing from followers list is desired or just strictly blocking
                await axios.post(`/users/${targetId}/block`);
            }

            // Optimistic update
            setData(prev => prev.filter(item => (item.id || item._id) !== targetId && (item.user_id !== targetId)));
        } catch (err) {
            console.error('Action failed', err);
            alert('Action failed. Please try again.');
        }
    };

    const filteredData = React.useMemo(() => {
        const seen = new Set();
        return (Array.isArray(data) ? data : []).filter(item => {
            const u = item.follower || item.target || item;
            const id = u.id || u._id;

            // Deduplicate based on user ID
            if (!id || seen.has(id)) return false;
            seen.add(id);

            const username = u.username || '';
            return username.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [data, searchQuery]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Connections</h1>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                {RELATIONSHIP_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'
                            }`}
                    >
                        <tab.icon className="size-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:border-primary transition-colors text-slate-900 dark:text-white font-medium"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="size-8 text-primary animate-spin" />
                </div>
            ) : filteredData.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 border-dashed">
                    <div className="flex justify-center mb-4">
                        <UserX className="size-12 opacity-50" />
                    </div>
                    <p>No {activeTab} found</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode='popLayout'>
                        {filteredData.map((item) => {
                            // Normalize User Object
                            const userObj = activeTab === 'requests' ? item.follower : (activeTab === 'following' ? item : item);
                            const itemId = userObj.id || userObj._id; // Ensure ID availability

                            return (
                                <motion.div
                                    key={itemId}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl"
                                >
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => userObj.username && navigate(`/profile/${userObj.username}`)}>
                                        <img
                                            src={userObj.avatar_url || `https://ui-avatars.com/api/?name=${userObj.username}`}
                                            className="size-12 rounded-full object-cover border border-slate-200 dark:border-white/10"
                                            alt=""
                                        />
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{userObj.username}</h4>
                                            <p className="text-xs text-slate-500">{userObj.first_name} {userObj.last_name}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {activeTab === 'requests' && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(item.user_id, 'accept')}
                                                    className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleAction(item.user_id, 'decline')}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-sm font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </>
                                        )}
                                        {activeTab === 'following' && (
                                            <button
                                                onClick={() => handleAction(itemId, 'unfollow')}
                                                className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-sm font-bold rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-500 transition-colors"
                                            >
                                                Unfollow
                                            </button>
                                        )}
                                        {activeTab === 'followers' && (
                                            <button
                                                onClick={() => handleAction(itemId, 'block')}
                                                className="px-4 py-2 text-slate-400 hover:text-red-500 text-xs font-bold transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default Relationships;
