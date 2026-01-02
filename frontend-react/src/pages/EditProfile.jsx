import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { Loader2, Save, ArrowLeft, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EditProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        bio: '',
        avatar_url: '',
        is_private: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await axios.get('/auth/users/me');
                setFormData({
                    email: res.data.email || '',
                    first_name: res.data.first_name || '',
                    middle_name: res.data.middle_name || '',
                    last_name: res.data.last_name || '',
                    bio: res.data.bio || '',
                    avatar_url: res.data.avatar_url || '',
                    is_private: res.data.is_private || false,
                });
            } catch (err) {
                console.error('Failed to fetch user data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Exclude email from payload as it cannot be edited here
            const { email, ...updateData } = formData;

            // Sanitize empty strings to null to avoid 422 validation errors
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '') {
                    updateData[key] = null;
                }
            });

            if (avatarFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', avatarFile);
                const uploadRes = await axios.post('/posts/upload/image', uploadFormData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // Use the returned URL from the upload response
                updateData.avatar_url = uploadRes.data.url || uploadRes.data.view_link;
            }

            await axios.put('/auth/users/me', updateData);
            navigate(`/profile/${user?.username}`);
        } catch (err) {
            console.error('Failed to update profile', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="size-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="size-6 text-slate-900 dark:text-white" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Profile</h1>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl p-8 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group cursor-pointer">
                            <img
                                src={avatarPreview || formData.avatar_url || `https://ui-avatars.com/api/?name=${formData.first_name}`}
                                alt="Profile"
                                className="size-32 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl"
                            />
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Camera className="size-8 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Tap to change profile photo</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-border-dark text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Middle Name</label>
                            <input
                                type="text"
                                value={formData.middle_name}
                                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bio</label>
                        <textarea
                            rows={4}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-border-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white resize-none"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-border-dark">
                        <input
                            type="checkbox"
                            id="is_private"
                            checked={formData.is_private}
                            onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                            className="size-5 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="is_private" className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer select-none">
                            Private Account
                        </label>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {saving ? (
                                <Loader2 className="size-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="size-5" />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfile;