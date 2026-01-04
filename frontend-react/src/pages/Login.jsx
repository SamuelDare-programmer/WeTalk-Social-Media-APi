import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { LogIn, Sun, Moon, User, Eye, EyeOff, LayoutGrid, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);
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
                const { access_token, refresh_token } = response.data;
                await login(access_token, refresh_token, rememberMe);
                navigate('/');
            }
        } catch (err) {
            console.error('Login error', err);
            setError(err.response?.data?.detail || 'Invalid username or password');
            setShake(true);
            setTimeout(() => setShake(false), 500);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-[#1a1a2e] font-body antialiased min-h-screen flex items-center justify-center p-4 text-gray-900 dark:text-[#e0e0e0] transition-colors duration-300">
            <style>{`
                @keyframes subtle-zoom {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-subtle-zoom {
                    animation: subtle-zoom 20s ease-in-out infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
            {/* Notification Toast (Error handling) */}
            {error && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="backdrop-blur-xl bg-white/60 dark:bg-black/60 border border-white/40 dark:border-white/10 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[320px] max-w-md">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100/50 dark:bg-red-900/30 shadow-inner">
                            <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white font-display">Login Failed</h4>
                            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-0.5">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-[#24243e] text-gray-800 dark:text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-gray-200 dark:border-gray-700 group focus:outline-none"
            >
                {isDarkMode ? (
                    <Sun className="size-6 group-hover:rotate-12 transition-transform duration-300" />
                ) : (
                    <Moon className="size-6 group-hover:-rotate-12 transition-transform duration-300" />
                )}
            </button>

            {/* Main Card */}
            <div className="bg-white dark:bg-[#24243e] rounded-2xl shadow-2xl w-full max-w-5xl flex overflow-hidden min-h-[600px] flex-col md:flex-row relative transition-colors duration-300">

                {/* Left Side (Image) */}
                <div className="w-full md:w-1/2 relative bg-gray-900 overflow-hidden order-1 md:order-1 flex flex-col justify-center items-center text-white p-8">
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Abstract background"
                            className="w-full h-full object-cover opacity-80 mix-blend-overlay animate-subtle-zoom"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV_Ht34b0kebMA-ZpRg1jhfIGLLKd_ltwLJSDM2Am-xyLbkR9Uo3jsy-teR_bq5NvcpQYHwnUblAhonOI_UV2evIMe4KDgTardZjXQ8QzL7xG2G5A26gTIfiwIBjvFwc2sXY7h97Aw67FnfvJM-P9Ly2r44Kmvcxr_3q2xmEz8vioPWXSEtjNXyq9NiaNVdtalwGdcq8m5ukj50I7VmsI9OkIK9vE6k95e5EU4xsbD4SFbwijvhV-YDYnF0q8OfkDJXpNW0p1rUtxd"
                        />
                        <div className="absolute inset-0 bg-[#334BA2]/90 via-purple-900/80 to-black/90 mix-blend-multiply"></div>
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-[#7987C2]/20 to-transparent"></div>
                    </div>

                    <div className="relative z-10 text-center max-w-md backdrop-blur-sm bg-black/20 p-8 rounded-2xl border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                            <LayoutGrid className="size-8 text-white" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-4 font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            Welcome <br /> back!
                        </h2>
                        <p className="text-blue-100 text-lg font-light leading-relaxed mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            Reconnect with your Friends and pick up right where you left off.
                        </p>
                        {/* Decorative blobs */}
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"></div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center order-2 md:order-2">
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 font-display transition-colors duration-300">
                            Login
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
                            Please enter your login details to log in.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 transition-colors duration-300">
                                Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#4a4a6a] bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-all duration-300 text-sm"
                                    placeholder="Enter your username"
                                    required
                                />
                                <User className="absolute right-3 top-3 text-gray-500 size-5 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 transition-colors duration-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-[#4a4a6a] bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-all duration-300 text-sm"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-gray-500 hover:text-[#334BA2] transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs md:text-sm">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-[#334BA2] rounded border-gray-300 dark:border-gray-600 focus:ring-[#334BA2] bg-gray-100 dark:bg-gray-700 transition-colors duration-300 accent-[#334BA2]"
                                />
                                <span className="text-gray-600 dark:text-gray-400 select-none transition-colors duration-300">
                                    Keep me logged in
                                </span>
                            </label>
                            <Link to="/forgot-password" className="text-[#7987C2] hover:text-blue-400 font-medium transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#334BA2] hover:bg-[#253a85] text-white font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transform active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="size-5 animate-spin" />
                            ) : (
                                "Log in"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-[#7987C2] font-bold hover:underline">
                            Create account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
