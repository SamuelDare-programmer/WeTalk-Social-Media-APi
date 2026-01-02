import React, { useState } from 'react';
import { Clapperboard, X, Wand2, Type, Music, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const CreateStory = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        if (!selectedFile) return;

        setLoading(true);
        try {
            // 1. Upload Media First
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Determine endpoint based on file type
            const isVideo = selectedFile.type.startsWith('video');
            const uploadEndpoint = isVideo ? '/posts/upload/video' : '/posts/upload/image';

            const uploadRes = await axios.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const mediaId = uploadRes.data.media_id;

            // 2. Create Story with Media ID
            await axios.post('/stories/', {
                media_id: mediaId,
                caption: caption
            });

            navigate('/');
        } catch (err) {
            console.error('Failed to upload story', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
            <div className="relative w-full max-w-[400px] aspect-[9/16] bg-slate-900 rounded-[2.5rem] shadow-2xl border-8 border-slate-800 dark:border-slate-800 overflow-hidden flex flex-col group">
                {previewUrl ? (
                    <div className="relative flex-1 flex flex-col">
                        <div className="relative flex-1 bg-black overflow-hidden">
                            {selectedFile.type.startsWith('video') ? (
                                <video src={previewUrl} className="w-full h-full object-contain" autoPlay loop muted />
                            ) : (
                                <img src={previewUrl} className="w-full h-full object-contain" alt="" />
                            )}

                            {/* Overlay Controls */}
                            <div className="absolute top-6 right-6 flex flex-col gap-4">
                                <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"><X className="size-6" /></button>
                                <button className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"><Type className="size-6" /></button>
                                <button className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"><Wand2 className="size-6" /></button>
                                <button className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"><Music className="size-6" /></button>
                            </div>
                        </div>

                        {/* Caption Input Area */}
                        <div className="p-4 bg-slate-900/50 backdrop-blur-md absolute bottom-24 left-0 right-0 z-10 w-full">
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Add a caption..."
                                className="w-full bg-transparent text-white placeholder-white/50 text-center outline-none font-medium text-lg drop-shadow-md"
                            />
                        </div>

                        <div className="absolute bottom-6 left-0 right-0 px-8 flex gap-4 z-20">
                            <button
                                onClick={() => navigate('/')}
                                className="flex-1 py-3 bg-white/20 backdrop-blur-md text-white font-bold rounded-xl hover:bg-white/30 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-2 px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="size-5 animate-spin" /> : 'Share Story'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                        <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Clapperboard className="size-10 text-white/50" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Create Story</h3>
                        <p className="text-white/40 text-sm mb-8">Photos and videos will disappear from your profile after 24 hours.</p>

                        <label className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all cursor-pointer">
                            Select Media
                            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                        </label>
                    </div>
                )}
            </div>

            <p className="mt-8 text-slate-500 font-medium flex items-center gap-2">
                <InfoIcon className="size-4" />
                Tap to select a vertical photo or video for best results.
            </p>
        </div>
    );
};

const InfoIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
);

export default CreateStory;
