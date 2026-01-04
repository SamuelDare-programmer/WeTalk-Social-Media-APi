import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Plus } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const StoryTray = ({ onStoryClick }) => {
    const [stories, setStories] = useState([]);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [storiesRes, userRes] = await Promise.all([
                    axios.get('/stories/feed'),
                    axios.get('/auth/users/me')
                ]);
                setStories(storiesRes.data);
                setUser(userRes.data);
            } catch (err) {
                console.error('Failed to fetch stories', err);
            }
        };
        fetchData();
    }, []);

    const hasActiveStory = stories.some(group => group.user_id === user?.id || group.username === user?.username);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
            {/* Create Story Button - Only show if no active story */}
            {!hasActiveStory && (
                <div
                    className="relative w-[84px] h-[140px] shrink-0 rounded-xl overflow-hidden bg-slate-200 dark:bg-surface-dark group cursor-pointer border border-slate-200 dark:border-border-dark transition-all hover:brightness-110 snap-start"
                    onClick={() => navigate('/create/story')}
                >
                    <div
                        className="h-[100px] bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundImage: `url(${user?.avatar_url || user?.profile_image || `https://ui-avatars.com/api/?name=${user?.username || 'Me'}`})` }}
                    />
                    <div className="absolute bottom-0 w-full bg-white dark:bg-surface-dark h-[40px] flex flex-col items-center pt-3.5">
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary rounded-full p-0.5 border-2 border-white dark:border-surface-dark">
                            <Plus className="text-white size-5" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-800 dark:text-white leading-tight">Create</span>
                    </div>
                </div>
            )}

            {/* Stories List */}
            {stories.map((storyGroup, index) => {
                const latestStory = storyGroup.stories[0];
                const isUnread = storyGroup.stories.some(s => !s.viewed);

                return (
                    <div
                        key={storyGroup.user_id || storyGroup.username || `story-${index}`}
                        className="relative w-[84px] h-[140px] shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-border-dark group cursor-pointer snap-start transition-all hover:scale-105 active:scale-95"
                        onClick={() => onStoryClick?.(stories, index)}
                    >
                        <img
                            src={latestStory.thumbnail_url || latestStory.media_url}
                            alt={storyGroup.username}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                        />
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Author Avatar */}
                        <div className={`absolute top-2 left-2 size-8 rounded-full border-2 ${isUnread ? 'border-primary' : 'border-white/50'} overflow-hidden`}>
                            <img src={storyGroup.avatar_url || `https://ui-avatars.com/api/?name=${storyGroup.username}`} alt={storyGroup.username} className="w-full h-full object-cover" />
                        </div>

                        <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-[10px] font-bold text-white truncate drop-shadow-md">
                                {storyGroup.username}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StoryTray;
