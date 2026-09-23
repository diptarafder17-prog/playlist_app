/* =========================================================
   CYBER YT MUSIC PLAYER - COMPILED LOGIC (static/app.js)
   ========================================================= */

// ---------------------------------------------------------
// 1. API & BACKEND COMMUNICATION (fetch requests)
// ---------------------------------------------------------

/**
 * Fetches specific track details with complete error handling, 
 * timeouts, and UI state management.
 */
async function fetchTrackWithUIState(trackId) {
    // 1. Cache DOM Elements
    const submitBtn = document.getElementById('submitBtn');
    const spinner = document.getElementById('loadingSpinner');
    const errorContainer = document.getElementById('errorMessage');

    // 2. Set Loading State & Reset Previous Errors
    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (errorContainer) {
        errorContainer.textContent = '';
        errorContainer.classList.add('hidden');
    }

    // 3. Setup Request Timeout (Abort after 8 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });

        // 4. CRITICAL: Handle HTTP Errors (4xx, 5xx)
        if (!response.ok) {
            const errorPayload = await response.json().catch(() => null);
            const serverMessage = errorPayload?.message || `Error ${response.status}: ${response.statusText}`;
            throw new Error(serverMessage);
        }

        // 5. Parse and Return Data
        const data = await response.json();
        renderTrackDetails(data);

    } catch (error) {
        // 6. Categorize & Display Errors
        let userMessage = 'An unexpected error occurred.';

        if (error.name === 'AbortError') {
            userMessage = 'Request timed out. Please check your internet connection.';
        } else if (error instanceof TypeError) {
            userMessage = 'Unable to reach the server. Network may be offline.';
        } else {
            userMessage = error.message;
        }

        if (errorContainer) {
            errorContainer.textContent = userMessage;
            errorContainer.classList.remove('hidden');
        } else {
            console.error(userMessage);
        }

    } finally {
        // 7. ALWAYS Reset UI State
        clearTimeout(timeoutId);
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
    }
}

// GET: Retrieve playlist data from server
async function loadPlaylistData() {
    try {
        const response = await fetch('/api/playlist');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        renderPlaylistItems(data);
    } catch (error) {
        console.error('Failed to retrieve playlist:', error);
    }
}

// POST: Send JSON payload to server
async function saveFavoriteTrack(trackData) {
    try {
        const response = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trackData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || 'Failed to save track');
        }

        console.log('Track saved successfully');
        loadPlaylistData(); // Re-sync playlist UI
    } catch (error) {
        console.error('Error saving track:', error);
    }
}

// DELETE: Instruct backend to remove a resource
async function deleteTrack(trackId) {
    try {
        const response = await fetch(`/api/playlist?id=${encodeURIComponent(trackId)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete track');
        }

        loadPlaylistData(); // Refresh UI after deletion completes
    } catch (error) {
        console.error('Error deleting track:', error);
    }
}

// ---------------------------------------------------------
// 2. DOM & UI RENDERING
// ---------------------------------------------------------

// Updates now playing track title and CSS classes
function updateNowPlayingUI(trackInfo) {
    const titleEl = document.getElementById('trackTitle');
    const cardEl = document.getElementById('playerCard');

    if (titleEl) titleEl.textContent = trackInfo.title || 'Unknown Track';
    if (cardEl) cardEl.classList.add('playing');
}

// Wrapper for rendering individual track details
function renderTrackDetails(track) {
    updateNowPlayingUI(track);
}

// Dynamically renders the playlist array into the DOM
function renderPlaylistItems(items) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="empty-msg">No tracks saved yet.</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="playlist-item" data-id="${escapeHtml(item.id)}">
            <span>${escapeHtml(item.title)}</span>
            <button onclick="deleteTrack('${escapeHtml(item.id)}')">Remove</button>
        </div>
    `).join('');
}

// HTML escape helper to prevent XSS security issues
function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// Control function stubs (link these to your actual audio library/Iframe player)
function togglePlayback() {
    console.log('Toggling Play/Pause state...');
}

function setAudioVolume(volumeLevel) {
    console.log(`Setting volume to: ${volumeLevel}%`);
}

function toggleMute() {
    console.log('Toggling Mute state...');
}

// ---------------------------------------------------------
// 3. EVENT LISTENERS & SHORTCUTS
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. Play Button Click
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', togglePlayback);
    }

    // 2. Volume Range Slider
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            setAudioVolume(e.target.value);
        });
    }

    // Load initial playlist state on page startup
    loadPlaylistData();
});

// 3. Global Keypress Shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore shortcuts when user is typing in form fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
        e.preventDefault(); // Stop page scroll on Spacebar
        togglePlayback();
    } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
    }
});
Department 
