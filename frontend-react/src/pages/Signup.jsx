import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { useTheme } from '../context/ThemeContext';
import { UserPlus, LogIn, AlertCircle, CheckCircle, Sun, Moon } from 'lucide-react';

const Signup = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await axios.post('/auth/users/signup', formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            console.error('Signup error', err);
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="w-full max-w-[400px] bg-white dark:bg-surface-dark rounded-3xl shadow-xl border border-slate-200 dark:border-border-dark p-8 text-center">
                    <div className="size-16 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                        <CheckCircle className="size-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Created!</h2>
                    <p className="text-text-secondary">Please check your email to verify your account. Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors relative">
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
            >
                {isDarkMode ? <Sun className="size-6" /> : <Moon className="size-6" />}
            </button>

            <div className="w-full max-w-[450px] bg-white dark:bg-surface-dark rounded-3xl shadow-xl border border-slate-200 dark:border-border-dark p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                        JOIN WETALK
                    </h1>
                    <p className="text-text-secondary text-sm">Create an account to start sharing.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="size-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">First Name</label>
                            <input
                                name="first_name"
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Last Name</label>
                            <input
                                name="last_name"
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Username</label>
                        <input
                            name="username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary outline-none transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary outline-none transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary outline-none transition-all text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="size-5" />
                                <span>Create Account</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-border-dark text-center">
                    <p className="text-slate-500 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary font-bold hover:underline">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
