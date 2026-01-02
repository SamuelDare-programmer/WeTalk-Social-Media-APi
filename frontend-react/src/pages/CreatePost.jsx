import React, { useState } from 'react';
import { Image as ImageIcon, X, MapPin, Tag, Smile, Loader2, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';

const CreatePost = () => {
    const [caption, setCaption] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationQuery, setLocationQuery] = useState('');
    const [locationResults, setLocationResults] = useState([]);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [recentLocations, setRecentLocations] = useState([]);
    const [userCoords, setUserCoords] = useState(null);
    const [isCustomLocationMode, setIsCustomLocationMode] = useState(false);
    const [customLocation, setCustomLocation] = useState({ name: '', city: '', state: '', country: '' });
    const navigate = useNavigate();

    // Load recent locations on mount
    React.useEffect(() => {
        const savedRecents = localStorage.getItem('recent_locations');
        if (savedRecents) {
            setRecentLocations(JSON.parse(savedRecents));
        }
    }, []);

    // Debounced Search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (locationQuery.length < 2) {
                if (!locationQuery) setLocationResults([]);
                return;
            }

            setIsSearchingLocation(true);
            try {
                let url = `/discovery/search?q=${encodeURIComponent(locationQuery)}&type=place`;
                if (userCoords) {
                    url += `&lat=${userCoords.latitude}&lng=${userCoords.longitude}`;
                }
                const res = await axios.get(url);
                setLocationResults(res.data);
            } catch (err) {
                console.error("Location search failed", err);
                setLocationResults([]);
            } finally {
                setIsSearchingLocation(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [locationQuery, userCoords]);

    const handleFileChange = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const newPreviews = filesArray.map(file => ({
                url: URL.createObjectURL(file),
                type: file.type
            }));
            setSelectedFiles(prev => [...prev, ...filesArray]);
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            const newPreviews = [...prev];
            URL.revokeObjectURL(newPreviews[index].url);
            return newPreviews.filter((_, i) => i !== index);
        });
    };

    const handleSelectLocation = (place) => {
        setSelectedLocation(place);
        setIsLocationModalOpen(false);
        setLocationQuery('');
        setLocationResults([]);

        // Save to Recents
        const newRecents = [place, ...recentLocations.filter(p => p._id !== place._id)].slice(0, 5);
        setRecentLocations(newRecents);
        localStorage.setItem('recent_locations', JSON.stringify(newRecents));
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        setIsSearchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserCoords({ latitude, longitude });

                // Call Reverse Geocode
                try {
                    const res = await axios.get(`/discovery/geocode/reverse?lat=${latitude}&lng=${longitude}`);
                    if (res.data) {
                        // Auto-fill the search with the discovered location name
                        setLocationQuery(res.data.name);
                    }
                } catch (e) {
                    console.error("Reverse geocode failed", e);
                } finally {
                    setIsSearchingLocation(false);
                }
            },
            (error) => {
                console.error(error);
                setIsSearchingLocation(false);
                alert('Unable to retrieve your location');
            }
        );
    };

    const handleCustomLocationSubmit = async (e) => {
        e.preventDefault();
        if (!customLocation.name || !customLocation.country) {
            alert("Name and Country are required.");
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/discovery/places/custom', customLocation);
            handleSelectLocation(res.data);
        } catch (err) {
            console.error(err);
            alert("Failed to create custom location.");
        } finally {
            setLoading(false);
            setIsCustomLocationMode(false);
        }
    };

    // ... handleSubmit ...
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedFiles.length === 0) return;

        setLoading(true);
        try {
            // 1. Upload Media
            const uploadPromises = selectedFiles.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);

                // Fix: Check for video type correctly
                const isVideo = file.type.startsWith('video/');
                const uploadEndpoint = isVideo ? '/posts/upload/video' : '/posts/upload/image';

                const res = await axios.post(uploadEndpoint, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                return res.data.media_id;
            });

            const mediaIds = await Promise.all(uploadPromises);

            // 2. Create Post
            await axios.post('/posts/', {
                caption: caption,
                media_ids: mediaIds,
                location_id: selectedLocation?._id
            });
            navigate('/');
        } catch (err) {
            console.error('Failed to create post', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ... Header ... */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-black dark:text-white">Create New Post</h1>
                <button
                    onClick={handleSubmit}
                    disabled={selectedFiles.length === 0 || loading}
                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {loading ? <Loader2 className="size-5 animate-spin" /> : 'Share'}
                </button>
            </div>

            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row min-h-[500px]">
                {/* Media Upload Area */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-border-dark flex flex-col relative group overflow-hidden">
                    {previews.length > 0 ? (
                        <div className="w-full h-full p-4 overflow-y-auto grid grid-cols-2 gap-4 content-start">
                            {previews.map((preview, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 group/item">
                                    {preview.type.startsWith('video') ? (
                                        <video src={preview.url} className="w-full h-full object-cover" controls />
                                    ) : (
                                        <img src={preview.url} className="w-full h-full object-cover" alt="" />
                                    )}
                                    <button
                                        onClick={() => removeFile(idx)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-all opacity-0 group-hover/item:opacity-100"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-slate-400 hover:text-primary">
                                <Plus className="size-8 mb-2" />
                                <span className="text-xs font-bold">Add Media</span>
                                <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    ) : (
                        <label className="flex-1 flex flex-col items-center justify-center gap-4 cursor-pointer hover:scale-105 transition-all group w-full h-full">
                            <div className="size-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-border-dark group-hover:border-primary transition-colors">
                                <ImageIcon className="size-8 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            <span className="text-sm font-bold text-slate-600 dark:text-gray-400">Click to upload photos or videos</span>
                            <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handleFileChange} />
                        </label>
                    )}
                </div>

                {/* Caption & Info Area */}
                <div className="w-full md:w-[350px] flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:divide-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-8 rounded-full bg-slate-200 animate-pulse" />
                            <div className="h-4 w-24 bg-slate-200 animate-pulse rounded" />
                        </div>
                        <textarea
                            placeholder="Write a caption..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full h-40 bg-transparent border-none outline-none resize-none text-sm dark:text-white"
                        />
                        <div className="flex justify-between items-center mt-2 text-slate-400">
                            <Smile className="size-5 hover:text-primary cursor-pointer transition-colors" />
                            <span className="text-xs">{caption.length}/2200</span>
                        </div>
                    </div>

                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => setIsLocationModalOpen(true)}
                            className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all text-sm font-medium ${selectedLocation ? 'text-primary bg-primary/5' : 'text-slate-700 dark:text-gray-200'}`}
                        >
                            <div className="flex items-center gap-3">
                                <MapPin className={`size-5 ${selectedLocation ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="truncate max-w-[200px]">{selectedLocation ? selectedLocation.name : 'Add Location'}</span>
                            </div>
                            {selectedLocation ? (
                                <div onClick={(e) => { e.stopPropagation(); setSelectedLocation(null); }} className="p-1 hover:bg-slate-200 dark:hover:bg-white/20 rounded-full">
                                    <X className="size-4 text-slate-500" />
                                </div>
                            ) : (
                                <span className="text-slate-400">›</span>
                            )}
                        </button>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all text-sm font-medium text-slate-700 dark:text-gray-200">
                            <div className="flex items-center gap-3">
                                <Tag className="size-5 text-slate-400" />
                                <span>Tag People</span>
                            </div>
                            <span className="text-slate-400">›</span>
                        </button>
                    </div>

                    <div className="mt-auto p-6 text-[10px] text-slate-400 border-t border-slate-100 dark:border-white/5">
                        Your post will be shared with your followers and can appear on the Explore page.
                    </div>
                </div>
            </div>

            {/* Location Search Modal */}
            <AnimatePresence>
                {isLocationModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setIsLocationModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-border-dark flex flex-col max-h-[80vh]"
                        >
                            <div className="p-4 border-b border-slate-200 dark:border-border-dark flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                                <h3 className="font-bold text-lg dark:text-white">{isCustomLocationMode ? 'New Location' : 'Add Location'}</h3>
                                <button onClick={() => { setIsLocationModalOpen(false); setIsCustomLocationMode(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
                                    <X className="size-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-4 flex-1 overflow-y-auto">
                                {!isCustomLocationMode ? (
                                    <>
                                        <div className="relative mb-6">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Search places..."
                                                value={locationQuery}
                                                onChange={(e) => setLocationQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm focus:ring-2 focus:ring-primary/50 dark:text-white transition-all"
                                            />
                                            {isSearchingLocation && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Loader2 className="size-4 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* Current Location Button */}
                                            {!locationQuery && (
                                                <button
                                                    onClick={handleGetCurrentLocation}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left group"
                                                >
                                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                                                        <MapPin className="size-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">Use my current location</p>
                                                        {userCoords && <p className="text-xs text-green-500">Active</p>}
                                                    </div>
                                                </button>
                                            )}

                                            {/* Recent Locations */}
                                            {!locationQuery && recentLocations.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Recent</h4>
                                                    {recentLocations.map(place => (
                                                        <button
                                                            key={place._id}
                                                            onClick={() => handleSelectLocation(place)}
                                                            className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
                                                        >
                                                            <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-full">
                                                                <div className="size-5 border-2 border-slate-400 rounded-full opacity-50" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm dark:text-white">{place.name}</p>
                                                                <p className="text-xs text-slate-500 truncate">{place.address}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Search Results */}
                                            {locationQuery && (
                                                <div className="space-y-1">
                                                    {isSearchingLocation && locationResults.length === 0 ? (
                                                        // Skeletons
                                                        [1, 2, 3].map(i => (
                                                            <div key={i} className="flex items-center gap-3 p-3">
                                                                <div className="size-9 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse" />
                                                                <div className="space-y-2 flex-1">
                                                                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                                                                    <div className="h-3 w-2/3 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : locationResults.length > 0 ? (
                                                        locationResults.map(place => (
                                                            <button
                                                                key={place._id}
                                                                onClick={() => handleSelectLocation(place)}
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
                                                            >
                                                                <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-full">
                                                                    <MapPin className="size-5 text-slate-500 dark:text-slate-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm dark:text-white">{place.name}</p>
                                                                    <p className="text-xs text-slate-500 truncate">{place.address}</p>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        !isSearchingLocation && (
                                                            <div className="text-center py-8 text-slate-500">
                                                                <p>No places found.</p>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5">
                                            <button
                                                onClick={() => setIsCustomLocationMode(true)}
                                                className="w-full p-4 border border-dashed border-slate-300 dark:border-white/20 rounded-xl text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all text-sm font-bold"
                                            >
                                                Can't find it? Add Custom Location
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    // Custom Location Form
                                    <form onSubmit={handleCustomLocationSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Place Name</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="e.g. My Secret Base"
                                                value={customLocation.name}
                                                onChange={e => setCustomLocation(p => ({ ...p, name: e.target.value }))}
                                                className="w-full p-3 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">City (Optional)</label>
                                            <input
                                                type="text"
                                                value={customLocation.city}
                                                onChange={e => setCustomLocation(p => ({ ...p, city: e.target.value }))}
                                                className="w-full p-3 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm dark:text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">State (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={customLocation.state}
                                                    onChange={e => setCustomLocation(p => ({ ...p, state: e.target.value }))}
                                                    className="w-full p-3 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Country</label>
                                                <input
                                                    type="text"
                                                    value={customLocation.country}
                                                    onChange={e => setCustomLocation(p => ({ ...p, country: e.target.value }))}
                                                    className="w-full p-3 bg-slate-100 dark:bg-white/5 rounded-xl border-none outline-none text-sm dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomLocationMode(false)}
                                                className="flex-1 py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl font-bold"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-all"
                                            >
                                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Place'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CreatePost;
