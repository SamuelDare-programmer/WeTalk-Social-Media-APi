import React, { useState } from 'react';
import { Plus, Edit3, Clapperboard, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CreateFAB = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const options = [
        { icon: Edit3, label: 'Create Post', path: '/create/post', color: 'bg-blue-500' },
        { icon: Clapperboard, label: 'Add Story', path: '/create/story', color: 'bg-purple-500' }
    ];

    return (
        <div className="fixed bottom-24 right-6 xl:bottom-10 xl:right-10 z-50 flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="flex flex-col items-end gap-3 mb-2"
                    >
                        {options.map((option, idx) => (
                            <button
                                key={idx}
                                onClick={() => { navigate(option.path); setIsOpen(false); }}
                                className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-surface-dark rounded-full shadow-2xl border border-slate-100 dark:border-white/5 hover:scale-105 transition-all text-sm font-black dark:text-white group"
                            >
                                <span>{option.label}</span>
                                <div className={`size-8 rounded-full ${option.color} flex items-center justify-center text-white shadow-lg`}>
                                    <option.icon className="size-4" />
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`size-14 ${isOpen ? 'bg-slate-800' : 'bg-primary'} text-white rounded-full shadow-2xl flex items-center justify-center transition-colors relative group`}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <Plus className="size-8" />
                </motion.div>

                {!isOpen && (
                    <span className="absolute right-full mr-4 px-3 py-1 bg-black/80 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Create something new
                    </span>
                )}
            </motion.button>
        </div>
    );
};

export default CreateFAB;
