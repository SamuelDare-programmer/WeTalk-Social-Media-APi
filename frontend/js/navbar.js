function renderNavbar() {
    console.log("navbar.js: rendering...");
    const currentPath = window.location.pathname;
    const isFeed = currentPath.includes('feed.html');
    const isMessages = currentPath.includes('messaging.html');
    const isProfile = currentPath.includes('profile.html');
    const isExplore = currentPath.includes('explore.html');
    const isNotifications = currentPath.includes('notifications.html');

    // DESKTOP SIDEBAR (Visible on md+)
    const desktopNavbarHtml = `
<nav class="hidden md:flex w-20 hover:w-64 bg-white dark:bg-surface-dark flex-col items-center py-6 border-r border-slate-200 dark:border-border-dark flex-shrink-0 z-50 shadow-lg transition-all duration-300 ease-in-out group/nav h-screen sticky top-0">
    <div class="mb-6">
        <div onclick="location.href='profile.html'" class="w-12 h-12 rounded-full overflow-hidden border-2 border-primary mx-auto cursor-pointer nav-user-avatar ring-4 ring-primary/10 hover:ring-primary/20 transition-all shadow-md">
             <img src="https://ui-avatars.com/api/?name=User&background=random" class="w-full h-full object-cover">
        </div>
    </div>
    <div class="flex-1 flex flex-col gap-4 w-full px-2">
        <button onclick="location.href='feed.html'" class="p-3 rounded-xl transition-all flex items-center justify-center group-hover/nav:justify-start ${isFeed ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}">
            <span class="material-icons-outlined text-2xl">grid_view</span>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Feed</span>
        </button>
        <button onclick="location.href='explore.html'" class="p-3 rounded-xl transition-all flex items-center justify-center group-hover/nav:justify-start ${isExplore ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}">
            <span class="material-icons-outlined text-2xl">explore</span>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Explore</span>
        </button>
        <button onclick="location.href='notifications.html'" class="p-3 rounded-xl transition-all flex items-center justify-center group-hover/nav:justify-start ${isNotifications ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}">
            <div class="relative">
                <span class="material-icons-outlined text-2xl">notifications</span>
                <span id="nav-notification-badge" class="hidden absolute top-0 right-0 size-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
            </div>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Notifications</span>
        </button>
        <button onclick="location.href='messaging.html'" class="p-3 rounded-xl transition-all flex items-center justify-center group-hover/nav:justify-start ${isMessages ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}">
            <span class="material-icons-outlined text-2xl">forum</span>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Messages</span>
        </button>
        <button onclick="location.href='profile.html'" class="p-3 rounded-xl transition-all flex items-center justify-center group-hover/nav:justify-start ${isProfile ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}">
            <span class="material-icons-outlined text-2xl">person</span>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Profile</span>
        </button>
    </div>
    <div class="flex flex-col gap-2 w-full px-2">
        <button onclick="toggleDarkMode()" class="p-3 rounded-xl text-gray-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center group-hover/nav:justify-start">
            <span class="material-symbols-outlined text-2xl">dark_mode</span>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Theme</span>
        </button>
        <button onclick="handleLogout()" class="p-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center group-hover/nav:justify-start">
            <span class="material-icons-outlined text-2xl">logout</span>
            <span class="max-w-0 overflow-hidden opacity-0 group-hover/nav:max-w-xs group-hover/nav:ml-4 group-hover/nav:opacity-100 transition-all duration-300 whitespace-nowrap">Logout</span>
        </button>
    </div>
</nav>`;

    // MOBILE BOTTOM BAR (Visible on < md)
    const mobileNavbarHtml = `
<nav class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-border-dark z-50 flex justify-around items-center px-2 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
    <button onclick="location.href='feed.html'" class="p-2 rounded-full flex flex-col items-center justify-center ${isFeed ? 'text-primary' : 'text-gray-400 hover:text-primary'}">
        <span class="material-icons-outlined text-2xl">grid_view</span>
    </button>
    <button onclick="location.href='explore.html'" class="p-2 rounded-full flex flex-col items-center justify-center ${isExplore ? 'text-primary' : 'text-gray-400 hover:text-primary'}">
        <span class="material-icons-outlined text-2xl">explore</span>
    </button>
    <button onclick="document.getElementById('story-upload-modal').classList.remove('hidden')" class="p-3 -mt-8 bg-primary text-white rounded-full shadow-lg hover:bg-blue-600 transition-transform hover:scale-105 active:scale-95">
        <span class="material-icons-outlined text-2xl">add</span>
    </button>
    <button onclick="location.href='notifications.html'" class="p-2 rounded-full flex flex-col items-center justify-center ${isNotifications ? 'text-primary' : 'text-gray-400 hover:text-primary'}">
        <div class="relative">
            <span class="material-icons-outlined text-2xl">notifications</span>
            <span id="nav-notification-badge-mobile" class="hidden absolute top-0 right-0 size-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
        </div>
    </button>
    <button onclick="location.href='profile.html'" class="p-2 rounded-full flex flex-col items-center justify-center ${isProfile ? 'text-primary' : 'text-gray-400 hover:text-primary'}">
        <div class="size-6 rounded-full overflow-hidden border border-current nav-user-avatar">
            <img src="https://ui-avatars.com/api/?name=User&background=random" class="w-full h-full object-cover">
        </div>
    </button>
</nav>`;

    const body = document.body;
    // Prepend Desktop Sidebar
    body.insertAdjacentHTML('afterbegin', desktopNavbarHtml);
    // Append Mobile Bottom Bar
    body.insertAdjacentHTML('beforeend', mobileNavbarHtml);

    // Apply basic layout classes ensuring mobile content isn't hidden behind bottom bar
    if (!body.classList.contains('flex')) body.classList.add('flex');
    if (!body.classList.contains('h-screen')) body.classList.add('h-screen');
    if (!body.classList.contains('overflow-hidden')) body.classList.add('overflow-hidden');

    // Add padding to main content wrapper to prevent bottom bar overlap on mobile
    const mainWrapper = document.querySelector('.flex-1.overflow-y-auto');
    if (mainWrapper) {
        mainWrapper.classList.add('mb-16', 'md:mb-0'); // Add margin bottom on mobile
    }

    updateNavAvatar();
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    window.location.href = 'login.html';
}

async function updateNavAvatar() {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/auth/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            const avatarUrl = user.avatar_url || user.profile_image || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`;
            const navAvatar = document.querySelector('.nav-user-avatar img');
            if (navAvatar) navAvatar.src = avatarUrl;
        }
    } catch (e) { console.error(e); }
}

async function updateNotificationStatus() {
    const token = getAccessToken();
    if (!token) return;

    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const badge = document.getElementById('nav-notification-badge');
            if (badge) {
                if (data.unread_count > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (e) { console.error(e); }
}

function getAccessToken() {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

// Initial theme check
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

document.addEventListener('DOMContentLoaded', () => {
    renderNavbar();
    updateNotificationStatus();
    // Poll for notifications every minute
    setInterval(updateNotificationStatus, 60000);
});
