import React, { createContext, useContext, useState, useEffect } from 'react';

const VideoContext = createContext();

export const useVideo = () => useContext(VideoContext);

export const VideoProvider = ({ children }) => {
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('video_muted');
        return saved === 'true';
    });
    const [activeVideoId, setActiveVideoId] = useState(null);

    useEffect(() => {
        localStorage.setItem('video_muted', isMuted);
    }, [isMuted]);

    const toggleMute = () => setIsMuted(prev => !prev);

    const playVideo = (id) => {
        setActiveVideoId(id);
    };

    return (
        <VideoContext.Provider value={{ isMuted, setIsMuted, toggleMute, activeVideoId, playVideo }}>
            {children}
        </VideoContext.Provider>
    );
};
