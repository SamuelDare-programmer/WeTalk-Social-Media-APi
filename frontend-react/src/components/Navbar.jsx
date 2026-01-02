import React, { useState, useEffect } from 'react';
import { Home, Compass, Film, MessageSquare, Bell, User, PlusSquare, Search, LogOut, Menu, X, Sun, Moon, Plus, Image, Clapperboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../api/axios';
import { useTheme } from '../context/ThemeContext';

const Navbar = (props) => {
    const [user, setUser] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [showCreateOptions, setShowCreateOptions] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const navigate = useNavigate();
    const location = useLocation();
    const { isDarkMode, toggleTheme } = useTheme();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get('/auth/users/me');
                setUser(res.data);
            } catch (err) {
                console.error('Failed to fetch user', err);
            }
        };
        fetchUser();
    }, []);

    // Handle window resize for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Compass, label: 'Explore', path: '/explore' },
        { icon: Film, label: 'Shorts', path: '/shorts' },
        { icon: MessageSquare, label: 'Messages', path: '/messages' },
        { icon: Bell, label: 'Notifications', path: '/notifications' },
        { icon: User, label: 'Profile', path: `/profile/${user?.username || ''}` },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        navigate('/login');
    };

    return (
        <motion.nav
            onMouseEnter={() => !isMobile && setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowCreateOptions(false); }}
            initial={false}
            animate={{
                width: isMobile ? 280 : (isHovered ? 240 : 80),
                x: isMobile ? (props.isOpen ? 0 : '-100%') : 0
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 h-full bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-border-dark flex flex-col p-3 z-50 overflow-hidden shadow-2xl lg:shadow-none`}
        >
            <div className="mb-6 px-2 flex items-center justify-between h-10">
                <AnimatePresence mode="wait">
                    {(isHovered || isMobile) ? (
                        <motion.h1
                            key="logo-full"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent px-2"
                        >
                            WETALK
                        </motion.h1>
                    ) : (
                        <motion.div
                            key="logo-small"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="size-10 bg-primary rounded-xl flex items-center justify-center shrink-0"
                        >
                            <span className="text-white font-black text-xl">W</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile Close Button */}
                <button
                    onClick={props.onClose}
                    className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
                >
                    <X className="size-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => { navigate(item.path); props.onClose?.(); }}
                            className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all font-medium min-w-[48px] ${isActive
                                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <item.icon className={`size-6 shrink-0 ${isActive ? 'fill-current' : ''}`} />
                            {(isHovered || isMobile) && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </button>
                    );
                })}

                {/* Universal Create Button */}
                <div className="relative mt-2 px-1">
                    <button
                        onClick={() => setShowCreateOptions(!showCreateOptions)}
                        className="w-full h-11 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-4 transition-all"
                    >
                        <PlusSquare className="size-6 shrink-0" />
                        {(isHovered || isMobile) && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="font-bold whitespace-nowrap"
                            >
                                Create
                            </motion.span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showCreateOptions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-border-dark rounded-2xl shadow-2xl p-2 z-[60]"
                            >
                                <button
                                    onClick={() => { navigate('/create/post'); setShowCreateOptions(false); props.onClose?.(); }}
                                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all text-sm font-bold text-slate-700 dark:text-gray-200"
                                >
                                    <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                                        <Plus className="size-4" />
                                    </div>
                                    Create Post
                                </button>
                                <button
                                    onClick={() => { navigate('/create/story'); setShowCreateOptions(false); props.onClose?.(); }}
                                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all text-sm font-bold text-slate-700 dark:text-gray-200"
                                >
                                    <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600">
                                        <Film className="size-4" />
                                    </div>
                                    Add Story
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-border-dark">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-white/5 transition-all font-medium"
                >
                    <div className="size-6 flex items-center justify-center shrink-0">
                        {isDarkMode ? <Sun className="size-6" /> : <Moon className="size-6" />}
                    </div>
                    {(isHovered || isMobile) && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="whitespace-nowrap"
                        >
                            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </motion.span>
                    )}
                </button>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-medium"
                >
                    <LogOut className="size-6 shrink-0" />
                    {(isHovered || isMobile) && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="whitespace-nowrap"
                        >
                            Logout
                        </motion.span>
                    )}
                </button>
            </div>

            {/* Profile Summary at Bottom */}
            {user && (
                <div
                    className="mt-3 flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all h-14 overflow-hidden"
                    onClick={() => { navigate(`/profile/${user.username}`); props.onClose?.(); }}
                >
                    <div className="size-10 rounded-full overflow-hidden border border-slate-200 dark:border-border-dark shrink-0">
                        <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} alt={user.username} className="w-full h-full object-cover" />
                    </div>
                    {(isHovered || isMobile) && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 min-w-0"
                        >
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.username}</p>
                            <p className="text-xs text-text-secondary truncate">View profile</p>
                        </motion.div>
                    )}
                </div>
            )}
        </motion.nav>
    );
};

export default Navbar;
