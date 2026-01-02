import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { Home, Compass, PlusSquare, Film, User, Clock, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showMobileHeader, setShowMobileHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    React.useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                if (window.scrollY > lastScrollY && window.scrollY > 100) {
                    // Scrolling down & past 100px
                    setShowMobileHeader(false);
                } else {
                    // Scrolling up
                    setShowMobileHeader(true);
                }
                setLastScrollY(window.scrollY);
            }
        };

        window.addEventListener('scroll', controlNavbar);
        return () => window.removeEventListener('scroll', controlNavbar);
    }, [lastScrollY]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
            <Navbar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

            {/* Mobile Header */}
            <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-border-dark flex items-center justify-between px-4 z-40 transition-transform duration-300 ${showMobileHeader ? 'translate-y-0' : '-translate-y-full'}`}>
                <h1 className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    WETALK
                </h1>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 -mr-2 text-slate-500 dark:text-gray-400 hover:text-primary active:scale-95 transition-transform"
                >
                    <Menu className="size-7" />
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="lg:pl-20 min-h-screen relative transition-all pt-16 lg:pt-0">
                <div className="max-w-[1100px] mx-auto px-4 py-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
