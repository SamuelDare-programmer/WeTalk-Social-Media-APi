const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
console.log("feed.js loaded");
let globalMuted = true;
let allLoadedPosts = [];

function formatCaption(text) {
    if (!text) return '';
    return text.replace(/#(\w+)/g, '<span class="text-primary font-medium cursor-pointer hover:underline" onclick="location.href=\'explore.html?tag=$1\'">#$1</span>')
        .replace(/@(\w+)/g, '<span class="text-primary font-medium cursor-pointer hover:underline" onclick="location.href=\'profile.html?username=$1\'">@$1</span>');
}

function createPostHtml(post) {
    let mediaHtml = '';
    const author = post.author || {};
    const authorName = `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.username || 'Unknown';
    const authorAvatar = author.avatar_url || `https://ui-avatars.com/api/?name=${author.username}&background=random`;
    const timeAgo = post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now';

    // Handle media array from backend response
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
        const m = post.media[0];
        if (post.media.length === 1) {
            const url = m.view_link || m.url;
            const isVideo = (m.media_type && m.media_type.startsWith('video')) || url.match(/\.(mp4|webm|ogg|mov)$/i);
            if (isVideo) {
                mediaHtml = `
                    <div class="relative overflow-hidden rounded-xl mt-3 group/media bg-black min-h-[300px] flex items-center justify-center cursor-pointer video-container">
                        <video src="${url}" class="w-full h-auto max-h-[700px] object-contain" playsinline loop ${globalMuted ? 'muted' : ''}></video>
                        
                        <!-- Video Controls Overlay -->
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div class="heart-pop-container">
                                <span class="material-symbols-outlined text-white text-7xl drop-shadow-lg" style="font-variation-settings: 'FILL' 1;">favorite</span>
                            </div>
                        </div>
                        
                        <!-- Overlay Handlers -->
                        <div class="absolute inset-0 z-10" 
                             onclick="toggleFeedVideo(this.parentElement.querySelector('video'))"
                             ondblclick="handleDoubleTap('${post.id || post._id}', this.parentElement)"></div>
                        
                        <!-- Centered Play Icon -->
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 play-overlay">
                            <span class="material-symbols-outlined text-white text-6xl opacity-80 drop-shadow-lg">play_arrow</span>
                        </div>

                        <!-- Bottom Controls -->
                        <div class="absolute bottom-4 right-4 z-20 flex gap-2">
                             <button onclick="toggleMute(event)" class="mute-btn p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all">
                                <span class="material-symbols-outlined text-xl">${globalMuted ? 'volume_off' : 'volume_up'}</span>
                            </button>
                            <button onclick="toggleImmersiveMode('${post.id || post._id}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
                                <span class="material-symbols-outlined text-sm">bolt</span>
                                Shorts
                            </button>
                        </div>
                    </div>`;
            } else {
                mediaHtml = `
                    <div class="relative overflow-hidden rounded-xl mt-3 group/media cursor-pointer">
                        <img src="${url}" class="w-full h-auto max-h-[600px] object-contain bg-slate-50 dark:bg-black/20" alt="Post media" loading="lazy">
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div class="heart-pop-container">
                                <span class="material-symbols-outlined text-white text-7xl drop-shadow-lg" style="font-variation-settings: 'FILL' 1;">favorite</span>
                            </div>
                        </div>
                        <div class="absolute inset-0 z-10" ondblclick="handleDoubleTap('${post.id || post._id}', this.parentElement)"></div>
                    </div>`;
            }
        } else {
            // Carousel for Multiple Media
            const carouselId = `carousel-${post.id || post._id}`;
            const slidesHtml = post.media.map(m => {
                const url = m.view_link || m.url;
                if (!url) return '';
                const isVideo = (m.media_type && m.media_type.startsWith('video')) || url.match(/\.(mp4|webm|ogg|mov)$/i);
                let inner = '';
                if (isVideo) {
                    inner = `
                        <div class="relative w-full h-full flex items-center justify-center overflow-hidden min-h-[400px] video-container">
                            <video src="${url}" class="w-full h-auto max-h-[700px] object-contain bg-black mx-auto" playsinline loop ${globalMuted ? 'muted' : ''}></video>
                            
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div class="heart-pop-container">
                                    <span class="material-symbols-outlined text-white text-7xl drop-shadow-lg" style="font-variation-settings: 'FILL' 1;">favorite</span>
                                </div>
                            </div>
                            
                            <!-- Overlay Handlers -->
                            <div class="absolute inset-0 z-10" 
                                 onclick="toggleFeedVideo(this.parentElement.querySelector('video'))"
                                 ondblclick="handleDoubleTap('${post.id || post._id}', this.parentElement)"></div>

                            <!-- Centered Play Icon -->
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 play-overlay">
                                <span class="material-symbols-outlined text-white text-6xl opacity-80 drop-shadow-lg">play_arrow</span>
                            </div>

                            <!-- Bottom Controls -->
                            <div class="absolute bottom-4 right-4 z-20 flex gap-2">
                                <button onclick="toggleMute(event)" class="mute-btn p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all">
                                    <span class="material-symbols-outlined text-xl">${globalMuted ? 'volume_off' : 'volume_up'}</span>
                                </button>
                                <button onclick="toggleImmersiveMode('${post.id || post._id}')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">
                                    <span class="material-symbols-outlined text-sm">bolt</span>
                                    Shorts
                                </button>
                            </div>
                        </div>`;
                } else {
                    inner = `
                        <div class="relative w-full h-full flex items-center justify-center overflow-hidden">
                            <img src="${url}" class="w-full h-auto max-h-[600px] object-contain mx-auto" alt="Post media" loading="lazy">
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div class="heart-pop-container">
                                    <span class="material-symbols-outlined text-white text-7xl drop-shadow-lg" style="font-variation-settings: 'FILL' 1;">favorite</span>
                                </div>
                            </div>
                            <div class="absolute inset-0 z-10" ondblclick="handleDoubleTap('${post.id || post._id}', this.parentElement)"></div>
                        </div>`;
                }
                return `<div class="w-full flex-shrink-0 snap-center flex items-center justify-center bg-black/5 dark:bg-black/40 relative">${inner}</div>`;
            }).join('');

            const dotsHtml = post.media.map((_, i) => `
                <div class="w-1.5 h-1.5 rounded-full bg-white/50 transition-all duration-300 ${i === 0 ? 'bg-white scale-125' : ''}" data-index="${i}"></div>
            `).join('');

            mediaHtml = `
                <div class="relative group/carousel rounded-xl mt-3 overflow-hidden border border-slate-100 dark:border-border-dark selection:bg-transparent">
                    <div id="${carouselId}" 
                         class="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide touch-pan-x"
                         onscroll="updateCarouselDots('${carouselId}', this)">
                        ${slidesHtml}
                    </div>
                    ${post.media.length > 1 ? `
                        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-md px-2 py-1 rounded-full pointer-events-none z-10" id="${carouselId}-dots">
                            ${dotsHtml}
                        </div>
                        <div class="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-full pointer-events-none">
                            1/${post.media.length}
                        </div>
                    ` : ''}
                </div>`;
        }
    }

    const isLiked = post.is_liked || false;
    const isBookmarked = post.is_bookmarked || false;
    const likeIconStyle = isLiked ? "font-variation-settings: 'FILL' 1;" : "";
    const likeIconClass = isLiked ? "text-pink-500" : "";
    const likeBtnClass = isLiked ? "text-pink-500" : "hover:text-pink-500";
    const bookmarkClass = isBookmarked ? 'text-primary' : '';
    const bookmarkIcon = isBookmarked ? 'bookmark' : 'bookmark_border';

    return `
        <article class="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark p-4 shadow-sm group/post feed-card mb-4 transition-all hover:shadow-md">
            <div class="flex gap-3">
                <div class="size-10 rounded-full border border-slate-100 dark:border-border-dark cursor-pointer overflow-hidden shrink-0" 
                     onclick="location.href='profile.html?username=${author.username}'">
                     <img src="${authorAvatar}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between">
                        <h4 class="font-bold text-slate-900 dark:text-white text-sm hover:underline cursor-pointer" onclick="location.href='profile.html?username=${author.username}'">${authorName}</h4>
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-text-secondary">${timeAgo}</span>
                        </div>
                    </div>
                    <p class="text-slate-800 dark:text-gray-200 text-sm mt-2 whitespace-pre-wrap">${formatCaption(post.caption || post.content || '')}</p>
                    ${mediaHtml}
                </div>
            </div>
            <div class="flex items-center justify-between mt-4 pt-1 border-t border-slate-100 dark:border-border-dark">
                <div class="flex items-center gap-1">
                    <button onclick="handleLike('${post.id || post._id}', this)" class="interaction-btn ${likeBtnClass} group/like flex items-center gap-2 p-2 rounded-xl transition-all">
                        <span class="material-symbols-outlined text-[24px] group-hover/like:scale-110 transition-transform ${likeIconClass}" style="${likeIconStyle}">favorite</span>
                        <span class="text-xs font-bold count">${post.likes_count || 0}</span>
                    </button>
                    <button onclick="handleComment('${post.id || post._id}')" class="interaction-btn hover:text-primary group/comment flex items-center gap-2 p-2 rounded-xl transition-all">
                        <span class="material-symbols-outlined text-[24px] group-hover/comment:scale-110 transition-transform">chat_bubble</span>
                        <span class="text-xs font-bold">${post.comments_count || 0}</span>
                    </button>
                    <button onclick="handleShare('${post.id || post._id}', this)" class="interaction-btn hover:text-green-500 group/share flex items-center gap-2 p-2 rounded-xl transition-all">
                        <span class="material-symbols-outlined text-[24px] group-hover/share:scale-110 transition-transform">repeat</span>
                        <span class="text-xs font-bold count">${post.share_count || 0 || 0}</span>
                    </button>
                </div>
                <button onclick="handleBookmark('${post.id || post._id}', this)" class="interaction-btn hover:text-yellow-500 group/bookmark flex items-center gap-2 p-2 rounded-xl transition-all ${bookmarkClass}">
                    <span class="material-symbols-outlined text-[24px] group-hover/bookmark:scale-110 transition-transform">${bookmarkIcon}</span>
                </button>
            </div>
        </article>`;
}

// Carousel Logic
window.updateCarouselDots = function (carouselId, container) {
    const dotsContainer = document.getElementById(`${carouselId}-dots`);
    const countBadge = container.parentElement.querySelector('.absolute.top-4.right-4');
    if (!dotsContainer) return;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollLeft / width);

    // Update Dots
    Array.from(dotsContainer.children).forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('bg-white', 'scale-125');
            dot.classList.remove('bg-white/50');
        } else {
            dot.classList.remove('bg-white', 'scale-125');
            dot.classList.add('bg-white/50');
        }
    });

    // Update Badge
    if (countBadge) {
        const total = dotsContainer.children.length;
        countBadge.textContent = `${index + 1}/${total}`;
    }
};

// --- Feed Loading & Pagination ---
let feedOffset = 0;
const feedLimit = 10;
let isFeedLoading = false;
let hasMorePosts = true;

async function loadFeed(reset = false) {
    if (isFeedLoading) return;
    const container = document.getElementById('feed-container');
    if (reset) {
        feedOffset = 0;
        hasMorePosts = true;
        allLoadedPosts = [];
        container.innerHTML = '';
        const template = document.getElementById('post-skeleton-template');
        if (template) {
            for (let i = 0; i < 3; i++) {
                container.appendChild(template.content.cloneNode(true));
            }
        }
    }

    if (!hasMorePosts) return;

    isFeedLoading = true;

    try {
        const token = getAccessToken();
        console.log(`Loading feed with offset ${feedOffset}...`);
        const res = await fetch(`${API_BASE_URL}/feed/timeline?limit=${feedLimit}&offset=${feedOffset}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("Feed response status:", res.status);
        if (res.ok) {
            const posts = await res.json();
            console.log("Feed posts received:", posts.length);

            if (reset) {
                container.innerHTML = ''; // Clear skeletons
            }

            if (posts.length < feedLimit) {
                hasMorePosts = false;
            }

            if (posts.length === 0 && reset) {
                container.innerHTML = '<div class="text-center py-20 text-text-secondary">No posts yet. Follow people to see their posts!</div>';
            } else {
                posts.forEach(post => {
                    allLoadedPosts.push(post);
                    const postHtml = createPostHtml(post);
                    const div = document.createElement('div');
                    div.innerHTML = postHtml;
                    container.appendChild(div.firstElementChild);
                });
                feedOffset += posts.length;
            }
        } else {
            const errorText = await res.text();
            console.error("Feed API error:", errorText);
            if (reset) container.innerHTML = '<div class="text-center py-20 text-red-500">Failed to load feed. Please try again.</div>';
        }
    } catch (e) {
        console.error("Feed load failed", e);
        if (reset) container.innerHTML = '<div class="text-center py-20 text-red-500">Error loading feed.</div>';
    } finally {
        isFeedLoading = false;
        // Skeletons are already cleared if reset was true and success/fail happened
    }
}

// --- Shorts / Immersive Mode ---
let immersiveVideos = [];
let currentImmersiveIdx = 0;

async function toggleImmersiveMode(targetPostId) {
    const overlay = document.getElementById('immersive-overlay');
    const container = document.getElementById('immersive-video-container');
    const existingLoading = document.getElementById('shorts-loading-indicator');

    if (!overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        document.body.classList.remove('immersive-video-active');
        container.innerHTML = '';
        if (existingLoading) existingLoading.remove();
        return;
    }

    overlay.classList.remove('hidden');
    document.body.classList.add('immersive-video-active');
    container.innerHTML = '<div class="flex items-center justify-center h-full text-white">Loading Shorts...</div>';

    try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/discovery/explore?type=video&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const explorerResults = await res.json();
            console.log("Explorer results received:", explorerResults.length);

            immersiveVideos = [...explorerResults];

            // If we have a target ID, ensure it's at the front
            if (targetPostId) {
                const targetIdx = immersiveVideos.findIndex(p => String(p.id || p._id) === String(targetPostId));
                if (targetIdx !== -1) {
                    const [targetPost] = immersiveVideos.splice(targetIdx, 1);
                    immersiveVideos.unshift(targetPost);
                } else {
                    // Fallback: search in local main feed posts
                    const localPost = allLoadedPosts.find(p => String(p.id || p._id) === String(targetPostId));
                    if (localPost) {
                        console.log("Target found in local feed posts.");
                        immersiveVideos.unshift(localPost);
                    }
                }
            }

            // If still empty (no target or target not found), try to fill with any local videos
            if (immersiveVideos.length === 0) {
                const localVideos = allLoadedPosts.filter(p =>
                    p.media && p.media.some(m => {
                        const url = m.view_link || m.url;
                        return (m.media_type && m.media_type.startsWith('video')) || (url && url.match(/\.(mp4|webm|ogg|mov)$/i));
                    })
                );
                immersiveVideos = localVideos.slice(0, 5);
            } else if (immersiveVideos.length < 5) {
                // If we have some videos but not enough, try to append more from local
                const localVideos = allLoadedPosts.filter(p =>
                    p.media && p.media.some(m => {
                        const url = m.view_link || m.url;
                        return (m.media_type && m.media_type.startsWith('video')) || (url && url.match(/\.(mp4|webm|ogg|mov)$/i));
                    }) && !immersiveVideos.some(v => (v.id || v._id) === (p.id || p._id))
                );
                immersiveVideos = [...immersiveVideos, ...localVideos.slice(0, 5 - immersiveVideos.length)];
            }

            if (immersiveVideos.length === 0) {
                container.innerHTML = '<div class="flex items-center justify-center h-full text-white">No videos found.</div>';
                return;
            }
            renderImmersiveVideos();
        }
    } catch (e) {
        console.error("Failed to load immersive videos", e);
    }
}

async function handleLike(postId, btn) {
    const isLiked = btn.querySelector('.text-pink-500') !== null;
    const method = isLiked ? 'DELETE' : 'POST';

    try {
        const token = getAccessToken();

        // Immediate UI feedback
        const icon = btn.querySelector('.material-symbols-outlined');
        const countSpan = btn.querySelector('.count');
        const isNowLiked = !isLiked;

        if (icon) {
            if (isNowLiked) {
                icon.style.fontVariationSettings = "'FILL' 1";
                icon.classList.add('text-pink-500');
            } else {
                icon.style.fontVariationSettings = "";
                icon.classList.remove('text-pink-500');
            }
        }

        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = isNowLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
        }

        const res = await fetch(`${API_BASE_URL}/posts/${postId}/likes`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const allLikeBtns = document.querySelectorAll(`[onclick*="handleLike('${postId}'"]`);
            allLikeBtns.forEach(b => {
                const icon = b.querySelector('.material-symbols-outlined');
                const countSpan = b.querySelector('.count');
                if (icon) {
                    if (data.is_liked) {
                        icon.style.fontVariationSettings = "'FILL' 1";
                        icon.classList.add('text-pink-500');
                        b.classList.add('text-pink-500');
                        b.classList.remove('hover:text-pink-500');
                    } else {
                        icon.style.fontVariationSettings = "";
                        icon.classList.remove('text-pink-500');
                        b.classList.remove('text-pink-500');
                        b.classList.add('hover:text-pink-500');
                    }
                }
                if (countSpan) countSpan.textContent = data.likes_count;
            });
        }
    } catch (e) { console.error("Like failed", e); }
}

async function handleBookmark(postId, btn) {
    const isBookmarked = btn.classList.contains('text-primary');
    const method = isBookmarked ? 'DELETE' : 'POST';

    try {
        const token = getAccessToken();

        // Immediate UI feedback
        const icon = btn.querySelector('.material-symbols-outlined');
        if (!isBookmarked) {
            btn.classList.add('text-primary');
            icon.textContent = 'bookmark';
        } else {
            btn.classList.remove('text-primary');
            icon.textContent = 'bookmark_border';
        }

        const res = await fetch(`${API_BASE_URL}/posts/${postId}/bookmark`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const allBookmarkBtns = document.querySelectorAll(`[onclick^="handleBookmark('${postId}'"]`);
            allBookmarkBtns.forEach(b => {
                const icon = b.querySelector('.material-symbols-outlined');
                if (data.is_bookmarked) {
                    b.classList.add('text-primary');
                    icon.textContent = 'bookmark';
                } else {
                    b.classList.remove('text-primary');
                    icon.textContent = 'bookmark_border';
                }
            });
        }
    } catch (e) { console.error("Bookmark failed", e); }
}

async function handleDoubleTap(postId, element) {
    const container = element.querySelector('.heart-pop-container');
    if (container) {
        container.classList.add('heart-pop-active');
        setTimeout(() => container.classList.remove('heart-pop-active'), 800);
    }
    const btn = element.closest('article')?.querySelector('.group/like') ||
        element.closest('.video-snap-item')?.querySelector('[onclick*="handleLike"]');
    if (btn && !btn.querySelector('.text-pink-500')) {
        handleLike(postId, btn);
    }
}

// Video Helper Functions
window.toggleFeedVideo = function (video) {
    if (video.paused) {
        video.play();
        video.parentElement.querySelector('.play-overlay')?.classList.add('opacity-0');
    } else {
        video.pause();
        video.parentElement.querySelector('.play-overlay')?.classList.remove('opacity-0');
    }
};

window.toggleMute = function (event) {
    if (event) event.stopPropagation();
    globalMuted = !globalMuted;

    // Apply to all videos on the page
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => {
        v.muted = globalMuted;
    });

    // Update all mute buttons
    const allMuteBtns = document.querySelectorAll('.mute-btn');
    allMuteBtns.forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = globalMuted ? 'volume_off' : 'volume_up';
    });
};

async function handleShare(postId, btn) {
    if (!confirm("Repost this content?")) return;
    try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/engagement/shares/${postId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const countSpan = btn.querySelector('.count');
            if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
            alert("Reposted successfully!");
        }
    } catch (e) { console.error(e); }
}

async function handleComment(postId) {
    window.currentPostIdForComments = postId;
    const modal = document.getElementById('comments-modal');
    const list = document.getElementById('comments-list');
    if (!modal || !list) return;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        modal.querySelector('#comments-modal-content').classList.remove('scale-95');
    }, 10);

    list.innerHTML = '<div class="flex justify-center p-8"><div class="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full"></div></div>';

    try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const comments = await res.json();
            if (comments.length === 0) {
                list.innerHTML = '<div class="text-center py-10 text-text-secondary">No comments yet. Be the first!</div>';
            } else {
                list.innerHTML = comments.map(c => {
                    const author = c.author || {};
                    const avatar = author.avatar_url || `https://ui-avatars.com/api/?name=${author.username}&background=random`;
                    return `
                        <div class="flex gap-3">
                            <div class="size-8 rounded-full bg-cover bg-center border border-slate-200 dark:border-border-dark shrink-0" 
                                 style='background-image: url("${avatar}");'></div>
                            <div class="flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2">
                                <p class="text-xs font-bold text-slate-900 dark:text-white">${author.username}</p>
                                <p class="text-sm text-slate-700 dark:text-gray-300 mt-1">${c.content}</p>
                            </div>
                        </div>`;
                }).join('');
            }
        }
    } catch (e) { console.error(e); }
}

window.closeCommentsModal = function () {
    const modal = document.getElementById('comments-modal');
    if (!modal) return;
    modal.classList.remove('opacity-100');
    modal.querySelector('#comments-modal-content')?.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 200);
};

window.submitComment = async function (event) {
    event.preventDefault();
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content || !window.currentPostIdForComments) return;

    try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/posts/${window.currentPostIdForComments}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        if (res.ok) {
            input.value = '';
            handleComment(window.currentPostIdForComments);
            const allCommentBtns = document.querySelectorAll(`[onclick^="handleComment('${window.currentPostIdForComments}'"]`);
            allCommentBtns.forEach(b => {
                const countSpan = b.querySelector('.text-xs');
                if (countSpan) countSpan.textContent = parseInt(countSpan.textContent) + 1;
            });
        }
    } catch (e) { console.error(e); }
};

function renderImmersiveVideos() {
    const container = document.getElementById('immersive-video-container');
    container.innerHTML = immersiveVideos.map((post, idx) => {
        const video = post.media.find(m => {
            const url = m.view_link || m.url;
            const isVideo = (m.media_type && m.media_type.startsWith('video')) || (url && url.match(/\.(mp4|webm|ogg|mov)$/i));
            return isVideo;
        });

        if (!video) {
            console.warn("No video media found for post:", post.id || post._id, post.media);
            return '';
        }

        const isLiked = post.is_liked || false;
        const likeIconStyle = isLiked ? "font-variation-settings: 'FILL' 1;" : "";
        const likeIconClass = isLiked ? "text-pink-500" : "text-white";
        const authorAvatar = post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.username || 'user'}&background=random`;
        const videoUrl = video.view_link || video.url;

        return `
            <div class="video-snap-item h-full w-full relative snap-start bg-black flex items-center justify-center">
                <div class="absolute inset-0 z-0 flex items-center justify-center bg-black">
                    <video src="${videoUrl}" class="max-h-full w-full object-contain" loop playsinline preload="auto" ${globalMuted ? 'muted' : ''}></video>
                </div>
                
                <!-- Progress Bar -->
                <div class="video-progress-container">
                    <div class="video-progress-bar"></div>
                </div>

                <!-- Main Overlay -->
                <div class="absolute inset-0 z-10 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
                    <div class="max-w-[80%] mb-12"> <!-- Extra margin for progress bar -->
                        <div class="flex items-center gap-3 pointer-events-auto cursor-pointer" onclick="location.href='profile.html?username=${post.author?.username}'">
                            <div class="size-10 rounded-full border-2 border-white overflow-hidden shadow-lg">
                                <img src="${authorAvatar}" class="w-full h-full object-cover">
                            </div>
                            <p class="font-bold text-lg text-white drop-shadow-md">@${post.author?.username || 'user'}</p>
                        </div>
                        <p class="text-sm text-white/90 mt-3 drop-shadow-md line-clamp-3 pointer-events-auto">${post.caption || ''}</p>
                    </div>
                </div>

                <!-- Interaction Sidebar -->
                <div class="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6 pointer-events-auto">
                    <button onclick="handleLike('${post.id || post._id}', this)" class="flex flex-col items-center gap-1 group/like">
                        <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/like:bg-white/20 transition-all">
                            <span class="material-symbols-outlined text-3xl ${likeIconClass}" style="${likeIconStyle}">favorite</span>
                        </div>
                        <span class="text-white text-xs font-bold drop-shadow-md count">${post.likes_count || 0}</span>
                    </button>
                    
                    <button onclick="handleComment('${post.id || post._id}')" class="flex flex-col items-center gap-1 group/comment">
                        <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/comment:bg-white/20 transition-all">
                            <span class="material-symbols-outlined text-3xl text-white">chat_bubble</span>
                        </div>
                        <span class="text-white text-xs font-bold drop-shadow-md">${post.comments_count || 0}</span>
                    </button>

                    <button onclick="handleBookmark('${post.id || post._id}', this)" class="flex flex-col items-center gap-1 group/bookmark">
                        <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/bookmark:bg-white/20 transition-all">
                            <span class="material-symbols-outlined text-3xl text-white">${post.is_bookmarked ? 'bookmark' : 'bookmark_border'}</span>
                        </div>
                    </button>

                    <button class="flex flex-col items-center gap-1 group/share">
                        <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/share:bg-white/20 transition-all">
                            <span class="material-symbols-outlined text-3xl text-white">share</span>
                        </div>
                    </button>

                    <button onclick="toggleMute(event)" class="mute-btn flex flex-col items-center gap-1 group/mute">
                        <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/mute:bg-white/20 transition-all">
                            <span class="material-symbols-outlined text-3xl text-white">${globalMuted ? 'volume_off' : 'volume_up'}</span>
                        </div>
                    </button>
                </div>

                <!-- Heart Pop Layer -->
                <div class="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                    <div class="heart-pop-container">
                        <span class="material-symbols-outlined text-white text-9xl drop-shadow-2xl" style="font-variation-settings: 'FILL' 1;">favorite</span>
                    </div>
                </div>

                <!-- Central Play/Pause Indicator -->
                <div class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center opacity-0 transition-opacity duration-300" id="play-pause-indicator-${idx}">
                    <div class="size-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                         <span class="material-symbols-outlined text-5xl text-white">play_arrow</span>
                    </div>
                </div>
                
                <!-- Interaction Detectors -->
                <div class="absolute inset-0 z-0" 
                     onclick="toggleImmersivePlay(this.parentElement.querySelector('video'), 'play-pause-indicator-${idx}')" 
                     ondblclick="handleDoubleTap('${post.id || post._id}', this.parentElement)"></div>
            </div>
        `;
    }).join('');

    setupImmersiveAutoplay();
}

function setupImmersiveAutoplay() {
    const container = document.getElementById('immersive-video-container');
    const options = { threshold: 0.7 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            const progressBar = entry.target.querySelector('.video-progress-bar');

            if (video) {
                if (entry.isIntersecting) {
                    video.muted = globalMuted;
                    video.play().catch(e => console.warn("Autoplay blocked", e));

                    // Track progress
                    video.ontimeupdate = () => {
                        if (video.duration) {
                            const progress = (video.currentTime / video.duration) * 100;
                            if (progressBar) progressBar.style.width = `${progress}%`;
                        }
                    };
                } else {
                    video.pause();
                    video.ontimeupdate = null;
                }
            }
        });
    }, options);

    container.querySelectorAll('.video-snap-item').forEach(item => {
        observer.observe(item);
    });

    // Infinite Scroll detection
    container.onscroll = () => {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
            console.log("Reached end of shorts, loading more...");
            loadMoreShorts();
        }
    };
}

window.toggleImmersivePlay = function (video, indicatorId) {
    const indicator = document.getElementById(indicatorId);
    const icon = indicator.querySelector('.material-symbols-outlined');

    if (video.paused) {
        video.play();
        icon.textContent = 'play_arrow';
    } else {
        video.pause();
        icon.textContent = 'pause';
    }

    // Flash indicator
    indicator.classList.remove('opacity-0');
    setTimeout(() => {
        indicator.classList.add('opacity-0');
    }, 500);
};

async function loadMoreShorts() {
    if (window.isLoadingMoreShorts) return;
    window.isLoadingMoreShorts = true;

    try {
        const token = getAccessToken();
        const res = await fetch(`${API_BASE_URL}/discovery/explore?type=video&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const moreVideos = await res.json();
            if (moreVideos.length > 0) {
                // Filter out duplicates
                const uniqueNewVideos = moreVideos.filter(nv => !immersiveVideos.some(ev => String(ev.id || ev._id) === String(nv.id || nv._id)));
                if (uniqueNewVideos.length > 0) {
                    immersiveVideos = [...immersiveVideos, ...uniqueNewVideos];
                    appendImmersiveVideos(uniqueNewVideos);
                }
            }
        }
    } catch (e) {
        console.error("Failed to load more shorts", e);
    } finally {
        window.isLoadingMoreShorts = false;
        const loader = document.getElementById('shorts-load-more-spinner');
        if (loader) loader.remove();
    }
}

function appendImmersiveVideos(newPosts) {
    const container = document.getElementById('immersive-video-container');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            const progressBar = entry.target.querySelector('.video-progress-bar');
            if (video) {
                if (entry.isIntersecting) {
                    video.muted = globalMuted;
                    video.play().catch(e => { });
                    video.ontimeupdate = () => {
                        if (video.duration && progressBar) {
                            progressBar.style.width = `${(video.currentTime / video.duration) * 100}%`;
                        }
                    };
                } else {
                    video.pause();
                    video.ontimeupdate = null;
                }
            }
        });
    }, { threshold: 0.7 });

    newPosts.forEach((post, idx) => {
        const video = post.media.find(m => {
            const url = m.view_link || m.url;
            return (m.media_type && m.media_type.startsWith('video')) || (url && url.match(/\.(mp4|webm|ogg|mov)$/i));
        });
        if (!video) return;

        const isLiked = post.is_liked || false;
        const likeIconClass = isLiked ? "text-pink-500" : "text-white";
        const videoUrl = video.view_link || video.url;
        const authorAvatar = post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.username || 'user'}&background=random`;
        const uniqueId = `append-${Date.now()}-${idx}`;

        const div = document.createElement('div');
        div.className = "video-snap-item h-full w-full relative snap-start bg-black flex items-center justify-center";
        div.innerHTML = `
            <div class="absolute inset-0 z-0 flex items-center justify-center bg-black">
                <video src="${videoUrl}" class="max-h-full w-full object-contain" loop playsinline ${globalMuted ? 'muted' : ''}></video>
            </div>
            <div class="video-progress-container">
                <div class="video-progress-bar"></div>
            </div>
            <div class="absolute inset-0 z-10 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none">
                <div class="max-w-[80%] mb-12">
                    <div class="flex items-center gap-3 pointer-events-auto cursor-pointer" onclick="location.href='profile.html?username=${post.author?.username}'">
                        <div class="size-10 rounded-full border-2 border-white overflow-hidden shadow-lg">
                            <img src="${authorAvatar}" class="w-full h-full object-cover">
                        </div>
                        <p class="font-bold text-lg text-white drop-shadow-md">@${post.author?.username || 'user'}</p>
                    </div>
                    <p class="text-sm text-white/90 mt-3 drop-shadow-md line-clamp-3 pointer-events-auto">${post.caption || ''}</p>
                </div>
            </div>
            <div class="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6 pointer-events-auto">
                <button onclick="handleLike('${post.id || post._id}', this)" class="flex flex-col items-center gap-1 group/like">
                    <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/like:bg-white/20 transition-all">
                        <span class="material-symbols-outlined text-3xl ${likeIconClass}">favorite</span>
                    </div>
                    <span class="text-white text-xs font-bold drop-shadow-md count">${post.likes_count || 0}</span>
                </button>
                <button onclick="handleComment('${post.id || post._id}')" class="flex flex-col items-center gap-1 group/comment">
                    <div class="size-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center group-hover/comment:bg-white/20 transition-all">
                        <span class="material-symbols-outlined text-3xl text-white">chat_bubble</span>
                    </div>
                    <span class="text-white text-xs font-bold drop-shadow-md">${post.comments_count || 0}</span>
                </button>
            </div>
            <div class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center opacity-0 transition-opacity duration-300" id="play-pause-indicator-${uniqueId}">
                <div class="size-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                     <span class="material-symbols-outlined text-5xl text-white">play_arrow</span>
                </div>
            </div>
            <div class="absolute inset-0 z-0" 
                 onclick="toggleImmersivePlay(this.parentElement.querySelector('video'), 'play-pause-indicator-${uniqueId}')" 
                 ondblclick="handleDoubleTap('${post.id || post._id}', this.parentElement)"></div>
        `;
        container.appendChild(div);
        observer.observe(div);
    });
}

async function checkAuth() {
    const token = getAccessToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    // Set Sidebar Profile
    const sidebarName = document.getElementById('profile-name-sidebar');
    const sidebarUser = document.getElementById('profile-username-sidebar');
    const sidebarAvatar = document.querySelector('.user-avatar-img');

    if (sidebarName) sidebarName.textContent = `${user.first_name} ${user.last_name}`;
    if (sidebarUser) sidebarUser.textContent = `@${user.username}`;
    if (sidebarAvatar) {
        const avatarUrl = user.avatar_url || user.profile_image || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`;
        if (sidebarAvatar.tagName === 'IMG') {
            sidebarAvatar.src = avatarUrl;
        } else {
            sidebarAvatar.style.backgroundImage = `url("${avatarUrl}")`;
        }
    }
}

async function loadSuggestions() {
    const list = document.getElementById('suggestions-list');
    if (!list) return;

    try {
        const token = getAccessToken();
        console.log("Fetching suggestions...");
        const res = await fetch(`${API_BASE_URL}/discovery/suggestions?limit=3`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Suggestions response status:", res.status);
        if (res.ok) {
            const users = await res.json();
            console.log("Suggestions data:", users);
            if (users.length === 0) {
                list.innerHTML = '<div class="px-2 text-xs text-text-secondary">No suggestions available.</div>';
                return;
            }

            list.innerHTML = users.map(u => `
                <div class="flex items-center gap-3 px-2 suggestion-item">
                    <div class="size-8 rounded-full bg-cover bg-center border border-slate-200 dark:border-border-dark cursor-pointer" 
                         style='background-image: url("${u.avatar_url || 'https://ui-avatars.com/api/?background=random'}");'
                         onclick="location.href='profile.html?username=${u.username}'"></div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:underline" 
                           onclick="location.href='profile.html?username=${u.username}'">${u.username}</p>
                        <p class="text-[10px] text-text-secondary truncate">${u.followers_count} followers</p>
                    </div>
                    <button onclick="followUser('${u.id}', this)" class="text-xs font-bold text-primary hover:text-indigo-600 transition-colors">Follow</button>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to load suggestions", e);
        list.innerHTML = '<div class="px-2 text-xs text-red-500">Failed to load.</div>';
    }
}

async function loadTrending() {
    const list = document.getElementById('trending-list');
    if (!list) return;

    try {
        const token = getAccessToken();
        console.log("Fetching trending tags...");
        const res = await fetch(`${API_BASE_URL}/discovery/trending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Trending response status:", res.status);
        if (res.ok) {
            const trends = await res.json();
            console.log("Trending data received:", trends);
            if (!trends || trends.length === 0) {
                list.innerHTML = '<div class="px-2 text-xs text-text-secondary">No trends today.</div>';
                return;
            }
            // Map 'name' (from API) to the UI display, handle potential 'post_count'
            list.innerHTML = trends.map(t => {
                const tagName = t.name || t.hashtag || 'unknown';
                const count = t.post_count || t.count || 0;
                return `
                    <div class="px-2 group cursor-pointer" onclick="location.href='explore.html?tag=${tagName.replace('#', '')}'">
                        <p class="text-xs font-bold text-slate-900 dark:text-white group-hover:underline">#${tagName.replace('#', '')}</p>
                        <p class="text-[10px] text-text-secondary">${count} posts</p>
                    </div>
                `;
            }).join('');
        } else {
            console.error("Trending API failed:", await res.text());
            list.innerHTML = '<div class="px-2 text-xs text-red-500">Failed to load trends.</div>';
        }
    } catch (e) {
        console.error("Trending error:", e);
        list.innerHTML = '<div class="px-2 text-xs text-red-500">Error loading trends.</div>';
    }
}

function toggleFabMenu() {
    const container = document.getElementById('fab-container');
    if (container) container.classList.toggle('fab-menu-expanded');
}

// Exclusive Video Playback Logic
document.addEventListener('play', (e) => {
    if (e.target.tagName !== 'VIDEO') return;
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(v => {
        if (v !== e.target && !v.paused) {
            v.pause();
        }
    });
}, true);

// Initialize
async function initFeed() {
    console.log("Initializing feed...");
    if (typeof getAccessToken !== 'function') {
        console.warn("getAccessToken not found, waiting...");
        setTimeout(initFeed, 100);
        return;
    }
    await checkAuth();
    loadFeed(true);
    loadSuggestions();
    loadTrending();

    if (window.StoryManager) {
        const token = getAccessToken();
        if (token) {
            window.storyManager = new StoryManager(API_BASE_URL, token);
            window.storyManager.onClose = async () => {
                const user = await getCurrentUser();
                if (user) {
                    window.currentUserId = user.id || user._id;
                    await window.storyManager.fetchFeed();
                    window.storyManager.renderTray('story-tray', { currentUserId: window.currentUserId, showCreatePlaceholder: true });
                }
            };
            window.storyManager.onUploadSuccess = window.storyManager.onClose;
            const user = await getCurrentUser();
            if (user) {
                window.currentUserId = user.id || user._id;
                await window.storyManager.fetchFeed();
                window.storyManager.renderTray('story-tray', { currentUserId: window.currentUserId, showCreatePlaceholder: true });
            }
            window.showStoryUploadModal = () => document.getElementById('story-upload-modal').classList.remove('hidden');
            window.hideStoryUploadModal = () => document.getElementById('story-upload-modal').classList.add('hidden');
            window.handleViewersClick = () => window.storyManager.openViewersModal();
            window.handleStoryAreaClick = (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < rect.width / 3) {
                    window.storyManager.prevStory();
                } else {
                    window.storyManager.nextStory();
                }
            };
        }
    }
    window.toggleFabMenu = toggleFabMenu;
    window.toggleImmersiveMode = toggleImmersiveMode;

    // Setup Main Feed Video Autoplay
    const feedObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.muted = globalMuted;
                video.play().then(() => {
                    video.parentElement.querySelector('.play-overlay')?.classList.add('opacity-0');
                }).catch(() => { });
            } else {
                video.pause();
                video.parentElement.querySelector('.play-overlay')?.classList.remove('opacity-0');
            }
        });
    }, { threshold: 0.6 });

    // Watch for new videos added to the feed
    const feedContainer = document.getElementById('feed-container');
    const feedMutationObserver = new MutationObserver(() => {
        feedContainer.querySelectorAll('video').forEach(video => {
            feedObserver.observe(video);
        });
    });
    if (feedContainer) {
        feedMutationObserver.observe(feedContainer, { childList: true, subtree: true });
    }
}

document.addEventListener('DOMContentLoaded', initFeed);

async function getCurrentUser() {
    const token = getAccessToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/auth/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
    } catch (e) { return null; }
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        loadFeed(true);
    }
});

let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
            loadFeed(false);
        }
    }, 100);
});
