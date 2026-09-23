/* =========================================================
   CYBER YT MUSIC PLAYER - INTERACTIVITY & LOGIC (static/app.js)
   ========================================================= */

// Global State Variables
let ytPlayer = null;
let isSeeking = false;
let updateTimer = null;
let currentTrack = null;
let localPlaylist = [];

// DOM Element References
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const seekSlider = document.getElementById('seekSlider');
const volumeSlider = document.getElementById('volumeSlider');
const muteBtn = document.getElementById('muteBtn');
const volumeIcon = document.getElementById('volumeIcon');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const trackTitle = document.getElementById('trackTitle');
const trackAuthor = document.getElementById('trackAuthor');
const favoriteBtn = document.getElementById('favoriteBtn');
const playlistItems = document.getElementById('playlistItems');
const playlistCount = document.getElementById('playlistCount');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

/* =========================================================
   1. YOUTUBE IFRAME API & PLAYER CONTROL
   ========================================================= */

// Called automatically by the YouTube API script once loaded
window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: '8ghwNVm4VjY', // Initial default video ID
        playerVars: {
            'playsinline': 1,
            'autoplay': 0,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
};

function onPlayerReady(event) {
    updateVolumeIcon(ytPlayer.getVolume());
    fetchPlaylist();              // Load saved playlist from backend
    fetchTrackInfo('8ghwNVm4VjY'); // Fetch metadata for initial track
}

function onPlayerStateChange(event) {
    // Dynamic UI update for play/pause state
    if (event.data === YT.PlayerState.PLAYING) {
        playIcon.className = 'fa-solid fa-pause';
        startSeekTimer();
    } else {
        playIcon.className = 'fa-solid fa-play';
        stopSeekTimer();
    }

    // Auto-play next track when video ends
    if (event.data === YT.PlayerState.ENDED) {
        playNextTrack();
    }
}

function loadAndPlayVideo(videoID) {
    if (!ytPlayer) return;
    ytPlayer.loadVideoById(videoID);
    fetchTrackInfo(videoID);
}

/* =========================================================
   2. HTTP REQUESTS (fetch() API to Backend & External Services)
   ========================================================= */

// GET: Load saved playlist from Flask backend (/api/playlist)
async function fetchPlaylist() {
    try {
        const res = await fetch('/api/playlist');
        if (res.ok) {
            localPlaylist = await res.json();
            renderPlaylist(); // Dynamic DOM render
        }
    } catch (error) {
        console.error("Failed to load playlist from backend:", error);
    }
}

// POST / DELETE: Toggle track in backend playlist database
async function toggleFavorite() {
    if (!currentTrack) return;
    
    const exists = localPlaylist.some(item => item.id === currentTrack.id);
    
    try {
        if (exists) {
            // Send DELETE request to Flask backend
            await fetch(`/api/playlist?id=${encodeURIComponent(currentTrack.id)}`, { 
                method: 'DELETE' 
            });
        } else {
            // Send POST request with JSON payload to Flask backend
            await fetch('/api/playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentTrack)
            });
        }
        // Refresh local playlist state after mutation
        fetchPlaylist();
    } catch (error) {
        console.error("Error saving/removing favorite track:", error);
    }
}

// DELETE: Remove specific track from playlist by ID
async function removeTrack(id) {
    try {
        await fetch(`/api/playlist?id=${encodeURIComponent(id)}`, { 
            method: 'DELETE' 
        });
        fetchPlaylist();
    } catch (error) {
        console.error("Error removing track:", error);
    }
}

// Fetch track details (Title, Creator) from oEmbed API
async function fetchTrackInfo(videoID) {
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoID}`);
        const data = await response.json();
        
        currentTrack = {
            id: videoID,
            title: data.title || 'YouTube Track',
            author: data.author_name || 'YouTube Creator',
            thumbnail: `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`
        };

        // Update DOM elements dynamically without reloading page
        trackTitle.textContent = currentTrack.title;
        trackAuthor.textContent = currentTrack.author;
        
        updateFavoriteButtonState();
        highlightActiveTrack(videoID);
    } catch (error) {
        currentTrack = {
            id: videoID,
            title: 'YouTube Track',
            author: 'Unknown Artist',
            thumbnail: `https://img.youtube.com/vi/${videoID}/hqdefault.jpg`
        };
        trackTitle.textContent = "YouTube Track (" + videoID + ")";
    }
}

/* =========================================================
   3. DYNAMIC UI UPDATES & DOM MANIPULATION
   ========================================================= */

function renderPlaylist() {
    playlistCount.textContent = `${localPlaylist.length} tracks`;
    updateFavoriteButtonState();

    if (localPlaylist.length === 0) {
        playlistItems.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-compact-disc"></i>
                <p>Your playlist is empty.<br>Save tracks using the heart icon.</p>
            </div>`;
        return;
    }

    // Build item cards dynamically
    playlistItems.innerHTML = localPlaylist.map(track => `
        <div class="playlist-item ${currentTrack && currentTrack.id === track.id ? 'active' : ''}" data-id="${track.id}">
            <img src="${track.thumbnail}" alt="thumb">
            <div class="item-info">
                <div class="item-title">${escapeHtml(track.title)}</div>
                <div class="item-author">${escapeHtml(track.author)}</div>
            </div>
            <button class="delete-item-btn" onclick="event.stopPropagation(); removeTrack('${track.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');

    // Attach click listeners to dynamically created items
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            loadAndPlayVideo(id);
        });
    });
}

function updateFavoriteButtonState() {
    if (!currentTrack) return;
    const isFav = localPlaylist.some(item => item.id === currentTrack.id);
    const icon = favoriteBtn.querySelector('i');
    
    if (isFav) {
        favoriteBtn.classList.add('active');
        icon.className = 'fa-solid fa-heart';
    } else {
        favoriteBtn.classList.remove('active');
        icon.className = 'fa-regular fa-heart';
    }
}

function highlightActiveTrack(videoID) {
    document.querySelectorAll('.playlist-item').forEach(item => {
        if (item.getAttribute('data-id') === videoID) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function startSeekTimer() {
    stopSeekTimer();
    updateTimer = setInterval(() => {
        if (!isSeeking && ytPlayer && ytPlayer.getCurrentTime) {
            const current = ytPlayer.getCurrentTime() || 0;
            const duration = ytPlayer.getDuration() || 0;
            
            seekSlider.max = duration;
            seekSlider.value = current;
            
            currentTimeEl.textContent = formatTime(current);
            totalTimeEl.textContent = formatTime(duration);
        }
    }, 500);
}

function stopSeekTimer() {
    if (updateTimer) clearInterval(updateTimer);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateVolumeIcon(vol) {
    if (vol == 0 || (ytPlayer && ytPlayer.isMuted())) {
        volumeIcon.className = 'fa-solid fa-volume-xmark';
    } else if (vol < 50) {
        volumeIcon.className = 'fa-solid fa-volume-low';
    } else {
        volumeIcon.className = 'fa-solid fa-volume-high';
    }
}

function extractVideoID(input) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return (match && match[2].length === 11) ? match[2] : input.trim();
}

function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

function playNextTrack() {
    if (!localPlaylist.length || !currentTrack) return;
    const currentIndex = localPlaylist.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % localPlaylist.length;
    loadAndPlayVideo(localPlaylist[nextIndex].id);
}

function playPrevTrack() {
    if (!localPlaylist.length || !currentTrack) return;
    const currentIndex = localPlaylist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + localPlaylist.length) % localPlaylist.length;
    loadAndPlayVideo(localPlaylist[prevIndex].id);
}

/* =========================================================
   4. USER ACTION EVENT LISTENERS
   ========================================================= */

// Load Video Button
loadBtn.addEventListener('click', () => {
    const id = extractVideoID(urlInput.value);
    if (id) loadAndPlayVideo(id);
});

urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const id = extractVideoID(urlInput.value);
        if (id) loadAndPlayVideo(id);
    }
});

// Play / Pause Toggle
playPauseBtn.addEventListener('click', () => {
    if (!ytPlayer) return;
    const state = ytPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
});

// Seek Bar Adjustment (Drag & Release)
seekSlider.addEventListener('mousedown', () => isSeeking = true);
seekSlider.addEventListener('touchstart', () => isSeeking = true);
seekSlider.addEventListener('change', () => {
    if (ytPlayer) {
        ytPlayer.seekTo(seekSlider.value, true);
    }
    isSeeking = false;
});

// Volume Adjustment Slider
volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    if (ytPlayer) {
        ytPlayer.setVolume(val);
        if (val > 0 && ytPlayer.isMuted()) ytPlayer.unMute();
    }
    updateVolumeIcon(val);
});

// Mute Button Toggle
muteBtn.addEventListener('click', () => {
    if (!ytPlayer) return;
    if (ytPlayer.isMuted()) {
        ytPlayer.unMute();
        updateVolumeIcon(ytPlayer.getVolume());
    } else {
        ytPlayer.mute();
        updateVolumeIcon(0);
    }
});

// Save / Favorite Track
favoriteBtn.addEventListener('click', toggleFavorite);

// Playlist Navigation
nextBtn.addEventListener('click', playNextTrack);
prevBtn.addEventListener('click', playPrevTrack);

/* =========================================================
   5. KEYBOARD SHORTCUTS
   ========================================================= */
document.addEventListener('keydown', (e) => {
    // Prevent shortcuts while typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
        e.preventDefault(); // Stop page scrolling
        playPauseBtn.click();
    } else if (e.key.toLowerCase() === 'm') {
        muteBtn.click();
    } else if (e.key === 'ArrowRight') {
        if (ytPlayer) ytPlayer.seekTo(ytPlayer.getCurrentTime() + 5, true);
    } else if (e.key === 'ArrowLeft') {
        if (ytPlayer) ytPlayer.seekTo(ytPlayer.getCurrentTime() - 5, true);
    }
});
