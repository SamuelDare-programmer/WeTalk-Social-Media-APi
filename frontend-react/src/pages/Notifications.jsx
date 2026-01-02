import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, Star, MoreHorizontal, Loader2, Check, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/notifications?limit=20');
            setNotifications(res.data.items);
            setUnreadCount(res.data.unread_count);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAllAsRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await axios.patch(`/notifications/${notif.id}/read`);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error('Failed to mark read', err);
            }
        }

        if (notif.type === 'follow') {
            if (notif.actor?.username) navigate(`/profile/${notif.actor.username}`);
        } else if (notif.target_id) {
            navigate(`/post/${notif.target_id}`);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'like': return <Heart className="size-4 fill-red-500 text-red-500" />;
            case 'follow': return <UserPlus className="size-4 text-blue-500" />;
            case 'comment': return <MessageCircle className="size-4 text-green-500" />;
            case 'mention': return <span className="text-xs font-bold text-primary">@</span>;
            case 'share': return <Repeat className="size-4 text-green-500" />;
            default: return <Star className="size-4 text-yellow-500" />;
        }
    };

    const getContent = (notif) => {
        switch (notif.type) {
            case 'like': return 'liked your post.';
            case 'follow': return 'started following you.';
            case 'comment': return `commented: "${notif.metadata?.preview || 'nice!'}"`;
            case 'mention': return 'mentioned you in a comment.';
            case 'share': return 'shared your post.';
            default: return 'interacted with you.';
        }
    };

    return (
        <div className="max-w-[600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black dark:text-white">Notifications</h1>
                    {unreadCount > 0 && (
                        <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                        <Check className="size-3" /> Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="size-8 text-primary animate-spin" /></div>
                ) : notifications.length === 0 ? (
                    <div className="py-20 text-center text-text-secondary">No new notifications.</div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 transition-all flex items-center justify-between group cursor-pointer ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img
                                            src={notif.actor.avatar_url || `https://ui-avatars.com/api/?name=${notif.actor.username}`}
                                            className="size-12 rounded-full border border-slate-200 dark:border-border-dark object-cover"
                                            alt=""
                                        />
                                        <div className="absolute -bottom-1 -right-1 size-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-sm">
                                            {getIcon(notif.type)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm dark:text-white">
                                            <span className="font-bold hover:underline">{notif.actor.username}</span>{' '}
                                            <span className="text-slate-600 dark:text-gray-400">{getContent(notif)}</span>
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Optional: Follow Back button could be re-added if we check follow status */}
                                    {!notif.is_read && (
                                        <div className="size-2 rounded-full bg-primary" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
