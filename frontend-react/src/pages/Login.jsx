import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { LogIn, UserPlus, AlertCircle, Sun, Moon } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // OAuth2PasswordRequestForm expects x-www-form-urlencoded
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await axios.post('/auth/users/login', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.data.access_token) {
                await login(response.data.access_token);
                navigate('/');
            }
        } catch (err) {
            console.error('Login error', err);
            setError(err.response?.data?.detail || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors relative">
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
            >
                {isDarkMode ? <Sun className="size-6" /> : <Moon className="size-6" />}
            </button>

            <div className="w-full max-w-[400px] bg-white dark:bg-surface-dark rounded-3xl shadow-xl border border-slate-200 dark:border-border-dark p-8">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                        WETALK
                    </h1>
                    <p className="text-text-secondary text-sm">Welcome back! Please login to continue.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="size-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Username or Email
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                            placeholder="username"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <LogIn className="size-5" />
                                <span>Login</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-border-dark text-center">
                    <p className="text-slate-500 text-sm">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-primary font-bold hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
