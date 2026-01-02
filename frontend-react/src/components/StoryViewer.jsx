import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideo } from '../context/VideoContext';

const StoryViewer = ({ storyGroups, initialGroupIndex = 0, onClose }) => {
    const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const { isMuted, toggleMute } = useVideo();

    const currentGroup = storyGroups[groupIndex];
    const currentStory = currentGroup.stories[storyIndex];

    const nextStory = useCallback(() => {
        if (storyIndex < currentGroup.stories.length - 1) {
            setStoryIndex(prev => prev + 1);
            setProgress(0);
        } else if (groupIndex < storyGroups.length - 1) {
            setGroupIndex(prev => prev + 1);
            setStoryIndex(0);
            setProgress(0);
        } else {
            onClose();
        }
    }, [storyIndex, groupIndex, currentGroup.stories.length, storyGroups.length, onClose]);

    const prevStory = useCallback(() => {
        if (storyIndex > 0) {
            setStoryIndex(prev => prev - 1);
            setProgress(0);
        } else if (groupIndex > 0) {
            setGroupIndex(prev => prev - 1);
            setStoryIndex(storyGroups[groupIndex - 1].stories.length - 1);
            setProgress(0);
        }
    }, [storyIndex, groupIndex, storyGroups]);

    useEffect(() => {
        const duration = currentStory.media_type?.startsWith('video') ? 10000 : 5000;
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    nextStory();
                    return 100;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [storyIndex, groupIndex, currentStory, nextStory]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
            <button
                onClick={onClose}
                className="absolute top-6 right-6 text-white/70 hover:text-white z-10 p-2"
            >
                <X className="size-8" />
            </button>

            <AnimatePresence mode="wait">
                <motion.div
                    key={`${groupIndex}-${storyIndex}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="relative w-full max-w-[450px] h-full max-h-[calc(100vh-100px)] aspect-[9/16] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center m-auto"
                >
                    {/* Blurred Background for Stories */}
                    <div className="absolute inset-0 z-0">
                        {currentStory.media_type?.startsWith('video') ? (
                            <video src={currentStory.media_url} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" muted playsInline />
                        ) : (
                            <img src={currentStory.media_url} alt="" className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
                        )}
                    </div>

                    {/* Media */}
                    {currentStory.media_type?.startsWith('video') ? (
                        <video
                            src={currentStory.media_url}
                            className="relative z-10 w-full h-full object-contain"
                            autoPlay
                            muted={isMuted}
                            playsInline
                        />
                    ) : (
                        <img
                            src={currentStory.media_url}
                            alt=""
                            className="relative z-10 w-full h-full object-contain"
                        />
                    )}

                    {/* Progress Bars */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex gap-1.5 z-20">
                        {currentGroup.stories.map((_, idx) => (
                            <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-75 ease-linear"
                                    style={{
                                        width: idx === storyIndex ? `${progress}%` : idx < storyIndex ? '100%' : '0%'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div className="absolute top-8 left-0 right-0 p-4 flex items-center justify-between z-20">
                        <div className="flex items-center gap-3">
                            <img
                                src={currentGroup.avatar_url || `https://ui-avatars.com/api/?name=${currentGroup.username}`}
                                className="size-10 rounded-full border border-white/20"
                                alt=""
                            />
                            <div className="flex flex-col">
                                <span className="text-white font-bold drop-shadow-md text-sm">{currentGroup.username}</span>
                                <span className="text-white/60 text-xs drop-shadow-md">
                                    {currentStory.created_at && formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                            className="text-white/80 hover:text-white"
                        >
                            {isMuted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
                        </button>
                    </div>

                    {/* Footer / Caption */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/80 to-transparent pt-20">
                        {currentStory.caption && (
                            <p className="text-white text-lg font-medium mb-2 drop-shadow-md text-center">
                                {currentStory.caption}
                            </p>
                        )}

                        <div className="flex items-center gap-2 text-white/60 text-sm">
                            <Eye className="size-4" />
                            <span>{currentStory.views_count} views</span>
                        </div>
                    </div>

                    {/* Navigation Overlays */}
                    <div className="absolute inset-0 flex z-10">
                        <div className="w-1/3 h-full cursor-w-resize" onClick={prevStory} />
                        <div className="w-2/3 h-full cursor-e-resize" onClick={nextStory} />
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Desktop Navigation Arrows */}
            {groupIndex > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setGroupIndex(prev => prev - 1); setStoryIndex(0); setProgress(0); }}
                    className="absolute left-10 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hidden md:block"
                >
                    <ChevronLeft className="size-12" />
                </button>
            )}
            {groupIndex < storyGroups.length - 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setGroupIndex(prev => prev + 1); setStoryIndex(0); setProgress(0); }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hidden md:block"
                >
                    <ChevronRight className="size-12" />
                </button>
            )}
        </div>
    );
};

export default StoryViewer;
