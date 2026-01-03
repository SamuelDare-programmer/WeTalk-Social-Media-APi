import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { useTheme } from '../context/ThemeContext';
import { UserPlus, AlertCircle, CheckCircle, Sun, Moon, Eye, EyeOff, LayoutGrid, Loader2 } from 'lucide-react';

const Signup = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
    });
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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

        if (!termsAccepted) {
            setError('Please agree to the Terms and Privacy Policy.');
            return;
        }

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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B1120] p-4">
                <div className="w-full max-w-[400px] bg-white dark:bg-[#1F2937] rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
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
        <div className="bg-gray-50 dark:bg-[#0B1120] font-body min-h-screen flex items-center justify-center p-4 antialiased transition-colors duration-300 text-gray-800 dark:text-gray-100">
            <style>{`
                @keyframes subtle-zoom {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-subtle-zoom {
                    animation: subtle-zoom 20s ease-in-out infinite;
                }
            `}</style>
            <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl flex flex-col md:flex-row min-h-[650px] transition-colors duration-300 border border-gray-200 dark:border-gray-700/50">

                {/* Left Side (Image) */}
                <div className="relative w-full md:w-5/12 hidden md:flex flex-col justify-center items-center text-white p-12 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Abstract background"
                            className="w-full h-full object-cover opacity-80 animate-subtle-zoom"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNxkSEEYxpwcnyPkscsW9A45IbDetTSqKmu_P2R0Xj_Wx_5W5pXYanEqzdD-IKWRrmyEDEQAVgALN2zLo2QdrPaCJ8mzSkwa2GoP2cxNVBwnbni1Q89WK441bXQtoXedMMO-UFvZ3VJqG_-BzpqXvtRvwWmxfY6Az_fwpuz9XjSMqoZFqYZnhq2cNRkij2qb1bJyJLrx0K__lJKS1zBXYEj7TgqEvKzu-X3wN5AMlc4km0PZvXwo_d8uPDPRpZfbystLmO35Bly2Ll"
                        />
                        <div className="absolute inset-0 bg-[#334BA2]/60 backdrop-blur-[2px]"></div>
                        <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
                    </div>
                    <div className="relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="text-left">
                            <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20 mb-8">
                                <LayoutGrid className="text-white size-6" />
                            </div>
                        </div>
                        <div className="flex flex-col justify-center items-center h-full text-center space-y-4 backdrop-blur-sm bg-gray-900/30 rounded-2xl p-8 border border-white/10 shadow-lg">
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white font-display animate-in fade-in slide-in-from-bottom-8 duration-1000">Let's Get <br />Started!</h1>
                            <p className="text-gray-300 text-sm max-w-xs mx-auto mt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">Join our community and explore new horizons with just a few clicks.</p>
                        </div>
                        <div className="w-full flex justify-center pt-8">
                            <div className="h-1 w-16 bg-white/30 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="w-full md:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative bg-white dark:bg-[#1F2937] transition-colors duration-300">
                    <button
                        onClick={toggleTheme}
                        className="absolute top-6 right-6 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#334BA2] z-20"
                        title="Toggle Theme"
                    >
                        {isDarkMode ? <Sun className="size-6" /> : <Moon className="size-6" />}
                    </button>

                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-display">Create Account</h2>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Please enter your details to sign up.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="size-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                    <input
                                        name="first_name"
                                        type="text"
                                        required
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="Enter your first name"
                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-shadow text-sm"
                                    />
                                </div>
                                <div className="w-full">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                    <input
                                        name="last_name"
                                        type="text"
                                        required
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="Enter your last name"
                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-shadow text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <input
                                    name="username"
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-shadow text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-shadow text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Create password"
                                        className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#334BA2] focus:border-transparent transition-shadow text-sm pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 text-right">Must be at least 8 characters.</p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="h-4 w-4 text-[#334BA2] rounded focus:ring-[#334BA2] border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 accent-[#334BA2]"
                                />
                                <label htmlFor="terms" className="ml-2 block text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                                    I agree with <a href="#" className="text-[#7987C2] hover:text-[#334BA2] dark:hover:text-white font-medium underline">Terms</a> and <a href="#" className="text-[#7987C2] hover:text-[#334BA2] dark:hover:text-white font-medium underline">Privacy Policy</a>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#334BA2] hover:bg-[#334BA2]/80 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-[#334BA2]/20 transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="size-5 animate-spin" />
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-xs">
                            <p className="text-gray-600 dark:text-gray-400">
                                Already have an account?{' '}
                                <Link to="/login" className="font-semibold text-[#7987C2] hover:text-[#334BA2] dark:hover:text-white transition-colors">
                                    Log in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
