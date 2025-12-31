/**
 * stories.js - Shared Story Logic for WeTalk
 */

class StoryManager {
    constructor(apiBaseUrl, token) {
        this.apiBaseUrl = apiBaseUrl;
        this.token = token;
        this.currentFeed = [];
        this.currentUserIdx = 0;
        this.currentStoryIdx = 0;
        this.storyTimer = null;
        this.isUploading = false;
    }

    async fetchFeed() {
        try {
            const res = await fetch(`${this.apiBaseUrl}/stories/feed`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                this.currentFeed = await res.json();
                return this.currentFeed;
            }
            return [];
        } catch (e) {
            console.error("Failed to load stories", e);
            return [];
        }
    }

    renderTray(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        const feedItems = this.currentFeed;

        // Custom "Your Story" logic if needed
        const currentUserId = options.currentUserId;
        const myIdx = feedItems.findIndex(item => String(item.user_id) === String(currentUserId));
        let myItem = null;
        let otherItems = [...feedItems];

        if (myIdx !== -1) {
            myItem = otherItems.splice(myIdx, 1)[0];
        }

        // Render My Story
        if (myItem || options.showCreatePlaceholder) {
            const card = this._createStoryCard(myItem || { user_id: currentUserId, username: 'Your Story', stories: [] }, true);
            container.appendChild(card);
        }

        // Render Others
        otherItems.forEach((item, idx) => {
            const realIdx = feedItems.indexOf(item);
            const card = this._createStoryCard(item, false, realIdx);
            container.appendChild(card);
        });
    }

    _createStoryCard(item, isMe, realIdx) {
        const hasStories = item.stories && item.stories.length > 0;
        const hasUnseen = hasStories && item.stories.some(s => !s.viewed);
        const ringClass = hasStories ? (hasUnseen ? 'story-ring-active' : 'story-ring-seen') : '';

        const card = document.createElement('div');
        card.className = "flex flex-col items-center gap-2 cursor-pointer min-w-[80px] group snap-start";

        const avatarUrl = item.avatar_url || `https://ui-avatars.com/api/?name=${item.username}&background=random`;

        card.innerHTML = `
            <div class="relative w-16 h-16 rounded-full ${ringClass} group-hover:scale-105 transition-transform duration-300">
                <div class="w-full h-full rounded-full border-2 border-surface-dark overflow-hidden bg-slate-800">
                    <img src="${avatarUrl}" class="w-full h-full object-cover">
                </div>
                ${isMe && !hasStories ? `
                    <div class="absolute bottom-0 right-0 bg-primary rounded-full size-5 border-2 border-surface-dark flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-[12px] font-bold">add</span>
                    </div>
                ` : ''}
            </div>
            <span class="text-[11px] font-medium truncate w-20 text-center text-slate-900 dark:text-white">${isMe ? 'Your Story' : item.username}</span>
        `;

        card.onclick = () => {
            if (isMe && !hasStories) {
                if (window.showStoryUploadModal) window.showStoryUploadModal();
            } else if (hasStories) {
                this.openViewer(realIdx !== undefined ? realIdx : this.currentFeed.indexOf(item));
            }
        };

        return card;
    }

    openViewer(userIdx) {
        this.currentUserIdx = userIdx;
        this.currentStoryIdx = 0;

        const userStories = this.currentFeed[userIdx].stories;
        const unseenIdx = userStories.findIndex(s => !s.viewed);
        if (unseenIdx !== -1) this.currentStoryIdx = unseenIdx;

        const overlay = document.getElementById('story-viewer-overlay');
        if (overlay) {
            if (window.pauseAllVideos) window.pauseAllVideos();
            overlay.classList.remove('hidden');
            this.showStory();
        }
    }

    closeViewer() {
        const overlay = document.getElementById('story-viewer-overlay');
        if (overlay) overlay.classList.add('hidden');

        clearTimeout(this.storyTimer);
        const video = document.getElementById('story-viewer-video');
        if (video) {
            video.pause();
            video.src = "";
        }

        // Callback to refresh tray
        if (this.onClose) this.onClose();
    }

    async showStory() {
        clearTimeout(this.storyTimer);
        const group = this.currentFeed[this.currentUserIdx];
        if (!group) { this.closeViewer(); return; }

        const viewersModal = document.getElementById('story-viewers-modal');
        if (viewersModal) viewersModal.classList.add('hidden');

        const story = group.stories[this.currentStoryIdx];
        if (!story) {
            this.nextUser();
            return;
        }

        // Update UI Elements
        this._updateViewerUI(group, story);

        // Media Handling
        const img = document.getElementById('story-viewer-image');
        const vid = document.getElementById('story-viewer-video');
        if (!img || !vid) return;

        img.classList.add('hidden');
        vid.classList.add('hidden');
        vid.pause();

        if (story.media_type === 'video') {
            vid.src = story.media_url;
            vid.classList.remove('hidden');
            vid.play().then(() => {
                // Success
            }).catch(e => {
                if (e.name !== 'AbortError') console.warn("Autoplay blocked", e);
            });
            vid.onended = () => this.nextStory();
        } else {
            img.src = story.media_url;
            img.classList.remove('hidden');
            this.storyTimer = setTimeout(() => this.nextStory(), 5000);
        }

        // Mark Viewed
        if (!story.viewed) {
            this._markViewed(story.id);
            story.viewed = true;
        }
    }

    _updateViewerUI(group, story) {
        const usernameEl = document.getElementById('story-viewer-username');
        const avatarEl = document.getElementById('story-viewer-avatar');
        const timeEl = document.getElementById('story-viewer-time');
        const captionEl = document.getElementById('story-viewer-caption');
        const viewsEl = document.getElementById('story-viewer-views');
        const progressContainer = document.getElementById('story-progress-container');

        if (usernameEl) usernameEl.textContent = group.username;
        if (avatarEl) avatarEl.src = group.avatar_url || `https://ui-avatars.com/api/?name=${group.username}`;
        if (timeEl) timeEl.textContent = this._formatTimestamp(story.created_at);
        if (captionEl) captionEl.textContent = story.caption || "";
        if (viewsEl) viewsEl.textContent = story.views_count;

        if (progressContainer) {
            progressContainer.innerHTML = group.stories.map((s, i) => `
                <div class="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div class="h-full bg-white transition-all duration-300 ${i < this.currentStoryIdx ? 'w-full' : (i === this.currentStoryIdx ? 'w-0 animate-progress' : 'w-0')}" 
                         style="${i === this.currentStoryIdx ? 'animation: progress-fill 5s linear forwards' : ''}"></div>
                </div>
            `).join("");
        }

        // Show/Hide Quick Reactions based on ownership
        const reactionOverlay = document.getElementById('story-reaction-overlay');
        if (reactionOverlay) {
            const isOwner = String(group.user_id) === String(window.currentUserId);
            reactionOverlay.classList.toggle('hidden', isOwner);
        }
    }

    async reactToStory(emoji) {
        const group = this.currentFeed[this.currentUserIdx];
        const story = group.stories[this.currentStoryIdx];
        if (!story) return;

        try {
            const res = await fetch(`${this.apiBaseUrl}/stories/${story.id}/react?emoji=${encodeURIComponent(emoji)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                this._showReactionAnimation(emoji);
            }
        } catch (e) {
            console.error("Failed to react", e);
        }
    }

    _showReactionAnimation(emoji) {
        const container = document.getElementById('story-viewer-overlay');
        if (!container) return;

        const bubble = document.createElement('div');
        bubble.className = "reaction-bubble text-4xl";
        bubble.textContent = emoji;
        bubble.style.left = `${Math.random() * 80 + 10}%`;
        bubble.style.bottom = "100px";

        container.appendChild(bubble);
        setTimeout(() => bubble.remove(), 1000);
    }

    async openViewersModal() {
        const group = this.currentFeed[this.currentUserIdx];
        const story = group.stories[this.currentStoryIdx];
        if (!story) return;

        const modal = document.getElementById('story-viewers-modal');
        const list = document.getElementById('story-viewers-list');
        if (!modal || !list) return;

        modal.classList.remove('hidden');
        list.innerHTML = '<p class="text-white/50 text-center py-10 animate-pulse">Loading activity...</p>';

        try {
            // Fetch both viewers and reactions
            const [viewersRes, reactionsRes] = await Promise.all([
                fetch(`${this.apiBaseUrl}/stories/${story.id}/viewers`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${this.apiBaseUrl}/stories/${story.id}/reactions`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            const viewers = viewersRes.ok ? await viewersRes.json() : [];
            const reactions = reactionsRes.ok ? await reactionsRes.json() : [];

            // Group reactions by user
            const reactionMap = {};
            reactions.forEach(r => {
                reactionMap[r.user_id] = r.emoji;
            });

            if (viewers.length === 0) {
                list.innerHTML = '<p class="text-white/50 text-center py-10">No views yet</p>';
                return;
            }

            list.innerHTML = viewers.map(v => `
                <div class="flex items-center justify-between group">
                    <div class="flex items-center gap-3">
                        <img src="${v.avatar_url || 'https://ui-avatars.com/api/?name=' + v.username}" class="w-10 h-10 rounded-full object-cover">
                        <div>
                            <p class="font-bold text-sm">${v.username}</p>
                            <p class="text-white/50 text-xs">${this._formatTimestamp(v.viewed_at || v.created_at)}</p>
                        </div>
                    </div>
                    ${reactionMap[v.user_id] ? `<div class="text-xl">${reactionMap[v.user_id]}</div>` : ''}
                </div>
            `).join("");

        } catch (e) {
            console.error("Failed to fetch viewers", e);
            list.innerHTML = '<p class="text-red-400 text-center py-10">Failed to load</p>';
        }
    }

    nextStory() {
        const group = this.currentFeed[this.currentUserIdx];
        if (group && this.currentStoryIdx < group.stories.length - 1) {
            this.currentStoryIdx++;
            this.showStory();
        } else {
            this.nextUser();
        }
    }

    prevStory() {
        if (this.currentStoryIdx > 0) {
            this.currentStoryIdx--;
            this.showStory();
        } else if (this.currentUserIdx > 0) {
            this.currentUserIdx--;
            const prevGroup = this.currentFeed[this.currentUserIdx];
            this.currentStoryIdx = prevGroup.stories.length - 1;
            this.showStory();
        }
    }

    nextUser() {
        if (this.currentUserIdx < this.currentFeed.length - 1) {
            this.currentUserIdx++;
            this.currentStoryIdx = 0;
            this.showStory();
        } else {
            this.closeViewer();
        }
    }

    _markViewed(storyId) {
        fetch(`${this.apiBaseUrl}/stories/${storyId}/view`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` }
        }).catch(e => console.error("Failed to mark story as viewed", e));
    }

    _formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    }

    async uploadStory(fileInputId, captionInputId, btnId) {
        const fileInput = document.getElementById(fileInputId);
        const captionInput = document.getElementById(captionInputId);
        const btn = document.getElementById(btnId);

        if (!fileInput || !fileInput.files[0]) return alert("Please select a file");
        if (this.isUploading) return;

        this.isUploading = true;
        const originalBtnText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Uploading...";

        try {
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);
            const type = fileInput.files[0].type.startsWith("video") ? "video" : "image";

            const uploadRes = await fetch(`${this.apiBaseUrl}/posts/upload/${type}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${this.token}` },
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            const storyRes = await fetch(`${this.apiBaseUrl}/stories`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    media_id: uploadData.media_id || uploadData.id,
                    caption: captionInput ? captionInput.value : ""
                })
            });

            if (storyRes.ok) {
                if (window.hideStoryUploadModal) window.hideStoryUploadModal();
                await this.fetchFeed();
                if (this.onUploadSuccess) this.onUploadSuccess();
            } else {
                throw new Error("Failed to create story");
            }
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            this.isUploading = false;
            btn.disabled = false;
            btn.textContent = originalBtnText;
        }
    }
}

// Global instance if needed
window.StoryManager = StoryManager;
