import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Info, Send, Smile, Paperclip, MessageSquare, Loader2, ArrowLeft, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

const Messages = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchChatQuery, setSearchChatQuery] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const messagesEndRef = useRef(null);
    const ws = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // WebSocket Connection
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://considerable-cathrin-wetalk-0d4f7320.koyeb.app/api/v1/conversations/ws?token=${token}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
                // If it's for the current open chat, add it
                if (selectedChat && data.conversation_id === selectedChat.id) {
                    setMessages(prev => [...prev, {
                        _id: Date.now().toString(), // Temp ID
                        conversation_id: data.conversation_id,
                        sender_id: data.sender_id,
                        content: data.content,
                        created_at: data.created_at,
                        is_me: data.sender_id === (user?._id || user?.id)
                    }]);
                }

                // Update inbox preview in any case
                setChats(prevChats => {
                    const newChats = [...prevChats];
                    const chatIdx = newChats.findIndex(c => c.id === data.conversation_id);
                    if (chatIdx > -1) {
                        const updatedChat = {
                            ...newChats[chatIdx],
                            last_message: data.content,
                            last_message_at: data.created_at,
                            unread: selectedChat?.id !== data.conversation_id
                        };
                        newChats.splice(chatIdx, 1);
                        newChats.unshift(updatedChat);
                    }
                    return newChats;
                });
            } else if (data.type === 'message_deleted') {
                if (selectedChat && data.conversation_id === selectedChat.id) {
                    setMessages(prev => prev.filter(m => m._id !== data.message_id));
                }
            }
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [selectedChat, user?._id]);

    // Fetch Inbox
    useEffect(() => {
        const fetchInbox = async () => {
            try {
                const res = await axios.get('/conversations/');
                setChats(res.data.map(c => ({
                    id: c._id,
                    name: c.group_name || c.participants.map(p => p.username).join(', '),
                    avatar: c.participants[0]?.avatar_url || `https://ui-avatars.com/api/?name=${c.participants[0]?.username}`,
                    lastMessage: c.last_message,
                    time: c.last_message_at ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false }) : '',
                    unread: c.unread_count > 0,
                    isGroup: c.is_group
                })));
            } catch (err) {
                console.error('Failed to fetch inbox', err);
            } finally {
                setLoadingChats(false);
            }
        };
        fetchInbox();
    }, []);

    // Handle deep linking to a specific chat from Profile
    useEffect(() => {
        if (location.state?.openChatId && chats.length > 0 && !selectedChat) {
            const chatToOpen = chats.find(c => c.id === location.state.openChatId);
            if (chatToOpen) {
                setSelectedChat(chatToOpen);
            }
        }
    }, [chats, location.state, selectedChat]);

    // Fetch Messages when chat selected
    useEffect(() => {
        if (!selectedChat) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await axios.get(`/conversations/${selectedChat.id}/messages`);
                setMessages(res.data);
            } catch (err) {
                console.error('Failed to fetch messages', err);
            } finally {
                setLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [selectedChat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            await axios.post(`/conversations/${selectedChat.id}/messages`, {
                content: newMessage
            });
            // We don't add to messages state here because WS will notify us
            // (consistent with real-time architectures)
            // But for snappiness, we could optimistic update.
            setNewMessage('');
        } catch (err) {
            console.error('Failed to send message', err);
        }
    };

    const handleSearchUsers = (e) => {
        setUserSearchQuery(e.target.value);
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (userSearchQuery.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearchingUsers(true);
            try {
                const res = await axios.get(`/auth/users/${userSearchQuery}`);
                setSearchResults([res.data]);
            } catch (err) {
                setSearchResults([]);
            } finally {
                setIsSearchingUsers(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [userSearchQuery]);

    const startNewChat = async (targetUser) => {
        const targetId = targetUser.id || targetUser._id;
        const currentUserId = user?.id || user?._id;

        if (!targetId || targetId === currentUserId) {
            return;
        }

        try {
            const res = await axios.post('/conversations/', { participant_ids: [targetId] });
            const newChatData = res.data;

            // Determine name/avatar (exclude self)
            const otherParticipant = newChatData.participants.find(p => (p.id || p._id) !== (user.id || user._id)) || targetUser;

            const mappedChat = {
                id: newChatData._id,
                name: newChatData.group_name || otherParticipant.username,
                avatar: otherParticipant.avatar_url || `https://ui-avatars.com/api/?name=${otherParticipant.username}`,
                lastMessage: '',
                time: 'Just now',
                unread: false,
                isGroup: newChatData.is_group
            };

            const existing = chats.find(c => c.id === mappedChat.id);
            if (!existing) {
                setChats([mappedChat, ...chats]);
                setSelectedChat(mappedChat);
            } else {
                setSelectedChat(existing);
            }
            setIsNewChatOpen(false);
            setUserSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            console.error("Failed to start chat", err);
        }
    };

    const handleDeleteClick = (e, chatId) => {
        e.stopPropagation();
        setChatToDelete(chatId);
    };

    const confirmDeleteChat = async () => {
        if (!chatToDelete) return;
        try {
            await axios.delete(`/conversations/${chatToDelete}`);
            setChats(prev => prev.filter(c => c.id !== chatToDelete));
            if (selectedChat?.id === chatToDelete) setSelectedChat(null);
        } catch (err) {
            console.error("Failed to delete chat", err);
        } finally {
            setChatToDelete(null);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!selectedChat) return;
        try {
            await axios.delete(`/conversations/${selectedChat.id}/messages/${messageId}`);
            setMessages(prev => prev.filter(m => m._id !== messageId));
        } catch (err) {
            console.error("Failed to delete message", err);
        }
    };

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchChatQuery.toLowerCase())
    );

    return (
        <div className="flex bg-white dark:bg-slate-950 overflow-hidden border-t border-slate-200 dark:border-border-dark animate-in fade-in duration-500 h-[calc(100vh-64px)] -mt-4 -mx-4 lg:fixed lg:inset-0 lg:top-16 lg:left-20 lg:m-0 lg:h-auto lg:z-30">
            {/* Chat List */}
            <div className={`w-full lg:w-[350px] flex flex-col border-r border-slate-200 dark:border-border-dark ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold dark:text-white">Messages</h2>
                    <button
                        onClick={() => setIsNewChatOpen(true)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all text-slate-900 dark:text-white"
                    >
                        <Edit className="size-5" />
                    </button>
                </div>

                <div className="px-6 mb-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchChatQuery}
                            onChange={(e) => setSearchChatQuery(e.target.value)}
                            placeholder="Search chats..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm transition-all focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2">
                    {loadingChats ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Loader2 className="size-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-1 cursor-pointer group relative ${selectedChat?.id === chat.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-900 dark:text-white'
                                    }`}
                            >
                                <div className="relative">
                                    <img src={chat.avatar} className="size-12 rounded-full border border-slate-200 dark:border-border-dark object-cover" alt="" />
                                    {chat.unread && <div className="absolute top-0 right-0 size-3 bg-primary rounded-full border-2 border-white dark:border-slate-950" />}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className={`text-sm font-bold truncate ${chat.unread ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{chat.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{chat.lastMessage}</p>
                                </div>
                                <span className="text-[10px] text-slate-400">{chat.time}</span>
                                <button
                                    onClick={(e) => handleDeleteClick(e, chat.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-900 shadow-sm rounded-full"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message Window */}
            <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden lg:flex' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-slate-200 dark:border-border-dark flex items-center justify-between bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedChat(null)} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-gray-400">
                                    <ArrowLeft className="size-5" />
                                </button>
                                <img src={selectedChat.avatar} className="size-10 rounded-full object-cover" alt="" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedChat.name}</p>
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => !selectedChat.isGroup && selectedChat.name && navigate(`/profile/${selectedChat.name}`)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-gray-400"
                                    title="View Profile"
                                >
                                    <Info className="size-5" />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(e, selectedChat.id)}
                                    className="p-2 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-full text-slate-600 dark:text-gray-400 transition-colors"
                                    title="Delete Conversation"
                                >
                                    <Trash2 className="size-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                            {loadingMessages ? (
                                <div className="flex justify-center py-10 opacity-30">
                                    <Loader2 className="size-8 animate-spin" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-center"><span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">History Loaded</span></div>

                                    {messages.map((msg, idx) => (
                                        <div key={msg._id || idx} className={`flex gap-3 max-w-[80%] group ${msg.is_me ? 'ml-auto flex-row-reverse' : ''}`}>
                                            {!msg.is_me && <img src={selectedChat.avatar} className="size-8 rounded-full self-end object-cover" alt="" />}
                                            <div className={`flex flex-col ${msg.is_me ? 'items-end' : ''}`}>
                                                <div className={`p-4 rounded-2xl text-sm ${msg.is_me
                                                    ? 'bg-primary text-white rounded-br-none shadow-lg shadow-primary/20'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-gray-200 rounded-bl-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[9px] text-slate-400 mt-1 px-1">
                                                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            {msg.is_me && (
                                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg._id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                        title="Delete message"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-4 p-2 bg-slate-100 dark:bg-white/5 rounded-2xl border border-transparent focus-within:border-primary/20 transition-all">
                                <button type="button" className="p-2 text-slate-500 hover:text-primary"><Smile className="size-6" /></button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Message..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white"
                                />
                                <button type="button" className="p-2 text-slate-500 hover:text-primary"><Paperclip className="size-6" /></button>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    <Send className="size-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-in fade-in zoom-in-95 duration-700">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <MessageSquare className="size-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Your Messages</h3>
                        <p className="text-slate-500 max-w-xs text-sm">Send private photos and messages to a friend or group.</p>
                        <button className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">Start Chatting</button>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <AnimatePresence>
                {isNewChatOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setIsNewChatOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-border-dark"
                        >
                            <div className="p-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center">
                                <h3 className="font-bold text-lg dark:text-white">New Message</h3>
                                <button onClick={() => setIsNewChatOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                                    <X className="size-5 text-slate-500" />
                                </button>
                            </div>
                            <div className="p-4">
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search people..."
                                        value={userSearchQuery}
                                        onChange={handleSearchUsers}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm focus:ring-2 focus:ring-primary/50 dark:text-white"
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {isSearchingUsers ? (
                                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map(u => (
                                            <button
                                                key={u.id || u._id}
                                                onClick={() => startNewChat(u)}
                                                className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
                                            >
                                                <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`} className="size-10 rounded-full object-cover" alt="" />
                                                <div>
                                                    <p className="font-bold text-sm dark:text-white">{u.username}</p>
                                                    <p className="text-xs text-slate-500">{u.full_name || u.first_name + ' ' + u.last_name}</p>
                                                </div>
                                            </button>
                                        ))
                                    ) : userSearchQuery && (
                                        <p className="text-center text-slate-500 text-sm py-4">No users found.</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {chatToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setChatToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20 dark:border-white/10 p-6 text-center"
                        >
                            <div className="mx-auto size-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="size-6 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Conversation?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                Are you sure you want to delete this conversation? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setChatToDelete(null)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteChat}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Messages;
