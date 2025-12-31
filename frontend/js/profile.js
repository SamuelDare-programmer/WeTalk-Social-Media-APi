// Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// DOM Elements
const profileDisplayNameEl = document.getElementById('profile-display-name');
const sidebarProfileNameEl = document.getElementById('sidebar-profile-name');
const profileHandleEl = document.getElementById('profile-handle');
const profileBioEl = document.getElementById('profile-bio');
const followersCountEl = document.getElementById('followers-count');
const followingCountEl = document.getElementById('following-count');
const profileActionsEl = document.getElementById('profile-actions');
const logoutBtn = document.getElementById('logout-btn');

// Pagination State
let currentOffset = 0;
const limit = 10;
let isLoading = false;
let hasMore = true;
let currentUserId = null;
let currentPostIdForComments = null;

// Helper to transform Cloudinary URLs
function getAvatarUrl(user, size = 'small') {
    if (!user) return 'https://ui-avatars.com/api/?name=Unknown&background=random';
    const url = user.avatar_url || user.profile_image;
    const name = (user.first_name || user.last_name) ? `${user.first_name} ${user.last_name}` : (user.username || 'User');

    if (url && url.includes('cloudinary.com') && url.includes('/upload/') && !url.includes('/w_')) {
        const transform = size === 'large' ? 'w_500,h_500,c_fill,g_face,q_auto,f_auto' : 'w_200,h_200,c_fill,g_face,q_auto,f_auto';
        return url.replace('/upload/', `/upload/${transform}/`);
    }
    return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
}

// Helper to optimize media URLs per policy
function getOptimizedMediaUrl(url, type = 'image') {
    if (!url || !url.includes('cloudinary.com') || !url.includes('/upload/')) return url;
    // Prevent double transformation if already present
    if (url.includes('/f_auto') && url.includes('/q_auto')) return url;

    let transform = 'f_auto,q_auto';
    if (type === 'image') transform += ',w_800,c_limit';
    if (type === 'video') transform += ',vc_auto';

    return url.replace('/upload/', `/upload/${transform}/`);
}

function formatCaption(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    let escaped = div.innerHTML;
    escaped = escaped.replace(/@(\w+)/g, '<a href="profile.html?username=$1" class="text-primary hover:underline font-semibold">@$1</a>');
    escaped = escaped.replace(/#(\w+)/g, '<a href="explore.html?tag=$1" class="text-primary hover:underline font-semibold">#$1</a>');
    return escaped;
}

// Authentication Check
async function checkAuth() {
    const token = getAccessToken();

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        console.log("Checking auth at:", `${API_BASE_URL}/auth/users/me`);
        const meResponse = await fetch(`${API_BASE_URL}/auth/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (meResponse.ok) {
            const currentUser = await meResponse.json();
            console.log("Current user loaded:", currentUser.username);
            updateSidebar(currentUser);

            const urlParams = new URLSearchParams(window.location.search);
            const usernameParam = urlParams.get('username');

            let targetUser = currentUser;
            let isOwner = true;

            if (usernameParam && usernameParam !== currentUser.username) {
                console.log("Fetching target user:", usernameParam);
                try {
                    const targetResponse = await fetch(`${API_BASE_URL}/users/${usernameParam}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (targetResponse.ok) {
                        targetUser = await targetResponse.json();
                        console.log("Target user loaded:", targetUser.username);
                        isOwner = false;
                    } else {
                        console.warn("Target user fetch returned non-ok status:", targetResponse.status);
                    }
                } catch (e) {
                    console.error("Target user fetch failed:", e);
                }
            }

            currentUserId = targetUser.id || targetUser._id;
            console.log("Final targetUserId:", currentUserId);

            if (!currentUserId) {
                console.error("Could not determine currentUserId from targetUser:", targetUser);
            }

            updateProfileUI(targetUser, isOwner);

            // Check for active tab in URL
            const tabParam = urlParams.get('tab');
            if (tabParam && ['posts', 'media', 'likes'].includes(tabParam)) {
                switchTab(tabParam);
            } else {
                loadUserPosts(true);
            }
        } else {
            console.warn("Me response not ok:", meResponse.status);
            if (meResponse.status === 401) handleLogout();
        }
    } catch (error) {
        console.error('Auth check process failed dangerously:', error);
    }
}

function updateSidebar(user) {
    const fullName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : 'User';
    const avatarUrl = getAvatarUrl(user);

    if (sidebarProfileNameEl) sidebarProfileNameEl.textContent = fullName;
    document.querySelectorAll('.user-avatar-img').forEach(el => {
        // Only update sidebar avatars, leave main profile avatar for updateProfileUI
        if (el.id !== 'profile-avatar-lg') {
            el.style.backgroundImage = `url("${avatarUrl}")`;
        }
    });
}

function updateProfileUI(user, isOwner) {
    const fullName = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : 'User';
    const handle = user.username ? `@${user.username}` : '@user';
    const avatarUrl = getAvatarUrl(user, 'large');

    if (profileDisplayNameEl) profileDisplayNameEl.textContent = fullName;
    if (profileHandleEl) profileHandleEl.textContent = handle;
    if (profileBioEl) profileBioEl.innerHTML = formatCaption(user.bio) || "No bio yet.";
    if (followersCountEl) followersCountEl.textContent = user.followers_count || 0;
    if (followingCountEl) followingCountEl.textContent = user.following_count || 0;

    const mainAvatar = document.getElementById('profile-avatar-lg');
    if (mainAvatar) mainAvatar.style.backgroundImage = `url("${avatarUrl}")`;

    if (profileActionsEl) {
        if (isOwner) {
            profileActionsEl.innerHTML = `
                <button onclick="window.location.href='edit_profile.html'" class="bg-white dark:bg-border-dark hover:bg-gray-50 dark:hover:bg-gray-700 text-slate-900 dark:text-white font-bold py-2 px-4 rounded-lg border border-slate-200 dark:border-gray-600 shadow-sm transition-colors text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">edit</span> Edit Profile
                </button>`;
        } else {
            profileActionsEl.innerHTML = `
                <div class="flex gap-2">
                    <button class="bg-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">person_add</span> Follow
                    </button>
                    <button onclick="openMessageChat('${user.id || user._id}')" class="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm transition-colors text-sm flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">mail</span> Message
                    </button>
                </div>`;
        }
    }
}

function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    window.location.href = 'login.html';
}

if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });

async function loadUserPosts(reset = false) {
    if (isLoading) return;
    if (!reset && !hasMore) return;
    if (!currentUserId) return;

    const token = getAccessToken();
    if (!token) return;

    isLoading = true;
    const container = document.getElementById('feed-container');

    if (reset) {
        currentOffset = 0;
        hasMore = true;
        container.innerHTML = '<div class="p-8 text-center text-text-secondary">Loading posts...</div>';
    } else {
        const loader = document.createElement('div');
        loader.id = 'infinite-scroll-loader';
        loader.className = 'p-4 text-center text-text-secondary text-sm';
        loader.textContent = 'Loading more...';
        container.appendChild(loader);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/posts/user/${currentUserId}?limit=${limit}&offset=${currentOffset}&_=${new Date().getTime()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.remove();

        if (response.ok) {
            const posts = await response.json();
            renderFeed(posts, reset);
        } else {
            console.error('Failed to fetch posts');
            if (reset) container.innerHTML = '<div class="p-8 text-center text-text-secondary">Failed to load posts.</div>';
        }
    } catch (error) {
        console.error('Error loading feed:', error);
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.remove();
        if (reset) container.innerHTML = '<div class="p-8 text-center text-text-secondary">Error loading posts.</div>';
    } finally {
        isLoading = false;
    }
}

function renderFeed(posts, reset) {
    const container = document.getElementById('feed-container');

    if (reset) {
        container.innerHTML = '';
        if (!posts || posts.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-text-secondary">No posts yet.</div>';
            hasMore = false;
            return;
        }
    }

    if (posts.length < limit) {
        hasMore = false;
    }

    currentOffset += posts.length;

    const postsHtml = posts.map(post => {
        const author = post.author || {};
        const firstName = author.first_name || 'User';
        const lastName = author.last_name || '';
        const authorName = `${firstName} ${lastName}`.trim() || 'Unknown User';
        const authorHandle = author.username ? `@${author.username}` : '@unknown';
        const authorAvatar = getAvatarUrl(author);
        const timeAgo = post.created_at ? new Date(post.created_at).toLocaleDateString() : '';

        let mediaHtml = '';

        if (post.media && Array.isArray(post.media) && post.media.length > 0) {
            post.media.forEach(m => {
                if (m.view_link) {
                    const isVideo = (m.media_type && m.media_type.startsWith('video')) || m.view_link.match(/\.(mp4|webm|ogg|mov)$/i);
                    if (isVideo) {
                        const optimizedUrl = getOptimizedMediaUrl(m.view_link, 'video');
                        mediaHtml += `<div class="w-full bg-black/20 cursor-pointer border-y border-slate-200 dark:border-border-dark"><video src="${optimizedUrl}" controls class="w-full h-auto max-h-[500px] bg-black" preload="metadata"></video></div>`;
                    } else {
                        const optimizedUrl = getOptimizedMediaUrl(m.view_link, 'image');
                        mediaHtml += `<div class="border-y border-slate-200 dark:border-border-dark"><img src="${optimizedUrl}" class="w-full h-auto" alt="Post media" loading="lazy"></div>`;
                    }
                }
            });
        }

        const isLiked = post.is_liked;
        const likeIconStyle = isLiked ? "font-variation-settings: 'FILL' 1;" : "";
        const likeIconClass = isLiked ? "text-pink-500" : "";
        const likeBtnClass = isLiked ? "text-pink-500" : "hover:text-pink-500";

        return `
        <article class="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden">
            <div class="p-4 ${mediaHtml ? 'pb-0' : ''}">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="bg-center bg-no-repeat bg-cover rounded-full size-10 shrink-0 cursor-pointer" style='background-image: url("${authorAvatar}");'></div>
                        <div>
                            <div class="flex items-center gap-1">
                                <a href="profile.html?username=${author.username}" class="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer">${authorName}</a>
                                <span class="material-symbols-outlined text-primary text-[16px] filled" style="font-variation-settings: 'FILL' 1;">verified</span>
                            </div>
                            <div class="flex items-center gap-1 text-xs text-text-secondary">
                                <span>${authorHandle}</span>
                                <span>·</span>
                                <span>${timeAgo}</span>
                                <span>·</span>
                                <span class="material-symbols-outlined text-[14px]">public</span>
                            </div>
                        </div>
                    </div>
                    <button class="text-text-secondary hover:bg-slate-100 dark:hover:bg-white/5 rounded-full p-2 transition-colors">
                        <span class="material-symbols-outlined">more_horiz</span>
                    </button>
                </div>
                <p class="text-slate-900 dark:text-white text-[15px] leading-normal whitespace-pre-wrap mb-3">${formatCaption(post.caption || post.content || '')}</p>
            </div>
            ${mediaHtml}
            <div class="px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-border-dark">
                <div class="flex items-center gap-1">
                    <div class="flex -space-x-1">
                        <div class="size-5 rounded-full bg-pink-500 flex items-center justify-center border border-white dark:border-surface-dark">
                            <span class="material-symbols-outlined text-white text-[10px]">favorite</span>
                        </div>
                    </div>
                    <span class="text-text-secondary text-sm ml-1 hover:underline cursor-pointer count">${post.likes_count || 0}</span>
                </div>
                <div class="text-text-secondary text-sm flex gap-3">
                    <span class="hover:underline cursor-pointer">${post.comments_count || 0} comments</span>
                    <span class="hover:underline cursor-pointer">${post.share_count || 0} shares</span>
                </div>
            </div>
            <div class="px-2 py-1 flex items-center justify-between">
                <button onclick="event.stopPropagation(); handleLike('${post.id || post._id}', this)" class="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-text-secondary font-medium ${likeBtnClass}">
                    <span class="material-symbols-outlined text-[20px] ${likeIconClass}" style="${likeIconStyle}">favorite</span>
                    Like
                </button>
                <button onclick="event.stopPropagation(); handleComment('${post.id || post._id}')" class="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-text-secondary font-medium">
                    <span class="material-symbols-outlined text-[20px]">chat_bubble</span>
                    Comment
                </button>
                <button onclick="event.stopPropagation(); handleShare('${post.id || post._id}', this)" class="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-text-secondary font-medium">
                    <span class="material-symbols-outlined text-[20px]">share</span>
                    Share
                </button>
            </div>
        </article>
        `;
    }).join('');

    container.insertAdjacentHTML('beforeend', postsHtml);

    if (!hasMore && !reset && posts.length > 0) {
        container.insertAdjacentHTML('beforeend', '<div class="p-8 text-center text-text-secondary text-sm">You\'re all caught up!</div>');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        loadUserPosts(false);
    }
});

// Engagement Actions (Same as feed.js)
async function handleLike(postId, btn) {
    const token = getAccessToken();
    if (!token) return;

    const icon = btn.querySelector('.material-symbols-outlined');
    const article = btn.closest('article');
    const countSpan = article ? article.querySelector('.count') : document.getElementById('modal-likes-count');

    if (!icon || !countSpan) {
        console.warn("Could not find icon or count span for like action.");
        // Fallback for simple toggle if specific elements aren't found
    }

    let currentCount = parseInt(countSpan ? countSpan.textContent : 0) || 0;
    const isLiked = icon ? icon.classList.contains('text-pink-500') : btn.classList.contains('text-pink-500');

    if (isLiked) {
        icon.style.fontVariationSettings = "";
        icon.classList.remove('text-pink-500');
        btn.classList.remove('text-pink-500');
        btn.classList.add('hover:text-pink-500');
        countSpan.textContent = Math.max(0, currentCount - 1);
    } else {
        icon.style.fontVariationSettings = "'FILL' 1";
        icon.classList.add('text-pink-500');
        btn.classList.add('text-pink-500');
        btn.classList.remove('hover:text-pink-500');
        countSpan.textContent = currentCount + 1;
    }

    try {
        const method = isLiked ? 'DELETE' : 'POST';
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/likes`, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API call failed');
    } catch (error) {
        console.error('Like action failed:', error);
        if (isLiked) {
            icon.style.fontVariationSettings = "'FILL' 1";
            icon.classList.add('text-pink-500');
            btn.classList.add('text-pink-500');
            btn.classList.remove('hover:text-pink-500');
        } else {
            icon.style.fontVariationSettings = "";
            icon.classList.remove('text-pink-500');
            btn.classList.remove('text-pink-500');
            btn.classList.add('hover:text-pink-500');
        }
        if (countSpan) {
            countSpan.textContent = isLiked ? (currentCount + 1) : Math.max(0, currentCount - 1); // Revert sync text
        }
    }
}

async function handleShare(postId, btn) {
    const token = getAccessToken();
    if (!token) return;
    if (!confirm("Repost this content?")) return;
    try {
        const response = await fetch(`${API_BASE_URL}/engagement/shares/${postId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            alert("Reposted successfully!");
        }
    } catch (error) {
        console.error('Share action failed:', error);
    }
}

// NOTE: The comment functions are copied from feed.js but are not used on this page yet.
// They are included for future use if a comment modal is added to the profile page.
function handleComment(postId) {
    alert("Comments feature coming soon! This would open a modal similar to the main feed.");
}

async function openMessageChat(targetUserId) {
    const token = getAccessToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/conversations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ participant_ids: [targetUserId] })
        });

        if (response.ok) {
            const conv = await response.json();
            window.location.href = `messaging.html?id=${conv._id || conv.id}`;
        } else {
            alert("Failed to start conversation");
        }
    } catch (error) {
        console.error("Error starting conversation:", error);
    }
}
// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("Profile JS loaded, starting checkAuth...");
    checkAuth();
});
