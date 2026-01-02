export const getTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
};

export const formatCaptionWithHashtags = (text) => {
    if (!text) return [];
    const parts = text.split(/([#@]\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('#')) {
            return { type: 'hashtag', text: part, key: i };
        } else if (part.startsWith('@')) {
            return { type: 'mention', text: part, key: i };
        }
        return { type: 'text', text: part, key: i };
    });
};
