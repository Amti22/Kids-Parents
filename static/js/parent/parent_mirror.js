// static/js/parent/parent_mirror.js
// [BLOCK: PARENT_MIRROR_ENGINE]
/**
 * [AUDIT]
 * ROLE: Dashboard Mirror & State Sync Engine.
 * UPDATES:
 * - Debug Integration: Sync events now pipe to the Python terminal.
 * - Robust Initialization: Improved race-condition handling for YT API and Sockets.
 * - UI Protection: Explicitly clears "Offline" placeholders upon first sync.
 */

window.ParentMirror = {
    players: {},
    pendingData: {},

    /**
     * Entry point for incoming state_report packets from the server.
     */
    handleSync: function(data) {
        // Force room ID to string for DOM selection safety
        const kidId = String(data.room || "8660AC2E");

        // CHECK 1: Signal Reception (Piped to Python Terminal)
        console.log(`[📥-MIRROR] Syncing ${kidId}: Vid ${data.videoId} at ${Math.round(data.currentTime)}s`);

        // Update Progress UI (Slider/Bar)
        const progressBar = document.getElementById(`progress-bar-${kidId}`);
        if (progressBar && data.currentTime && data.duration) {
            const percentage = (data.currentTime / data.duration) * 100;
            progressBar.style.width = `${percentage}%`;
        }

        // CHECK 2: Validate Video Data
        if (!data.videoId || data.videoId === "undefined") {
            return;
        }

        const mirrorId = `yt-mirror-${kidId}`;
        const placeholder = document.getElementById(`mirror-placeholder-${kidId}`);

        // CHECK 3: API Readiness
        if (typeof YT === 'undefined' || !YT.Player) {
            console.log(`[⏳] YT API not ready. Stashing packet for ${kidId}`);
            this.pendingData[kidId] = data;
            return;
        }

        // CHECK 4: Initialization vs. Update
        if (!this.players[kidId]) {
            this.initMirrorPlayer(kidId, mirrorId, data, placeholder);
        } else {
            this.updateMirrorPlayer(kidId, data, placeholder);
        }
    },

    /**
     * Creates the YouTube IFrame for the mirror.
     */
    initMirrorPlayer: function(kidId, elementId, data, placeholder) {
        const container = document.getElementById(elementId);
        if (!container) {
            console.error(`[❌] Mirror Container #${elementId} missing in HTML!`);
            return;
        }

        console.log(`[🎬] Initializing Mirror Player: ${kidId}`);
        if (placeholder) placeholder.style.display = 'none';

        // Ensure origin is correct for Ngrok/SSL
        const cleanOrigin = window.location.origin;

        try {
            this.players[kidId] = new YT.Player(elementId, {
                height: '100%',
                width: '100%',
                videoId: data.videoId,
                playerVars: {
                    'autoplay': 1,
                    'controls': 0,
                    'mute': 1,
                    'enablejsapi': 1,
                    'origin': cleanOrigin,
                    'start': Math.floor(data.currentTime || 0)
                },
                events: {
                    'onReady': (event) => {
                        console.log(`[✅] Mirror Ready: ${kidId}`);
                        event.target.mute();
                        if (data.isPlaying) event.target.playVideo();
                    },
                    'onError': (err) => console.error(`[YT-ERR] Code ${err.data} for ${kidId}`)
                }
            });
        } catch (err) {
            console.error(`[❌] Mirror Construction Failed:`, err);
        }
    },

    /**
     * Updates an existing player (Seek, Play/Pause, Load New Video).
     */
    updateMirrorPlayer: function(kidId, data, placeholder) {
        const player = this.players[kidId];
        // Validate player object and internal API
        if (!player || typeof player.getPlayerState !== 'function') return;

        if (placeholder && placeholder.style.display !== 'none') {
            placeholder.style.display = 'none';
        }

        // 1. Check for Video Change
        const currentVid = player.getVideoData() ? player.getVideoData().video_id : null;
        if (currentVid && currentVid !== data.videoId) {
            console.log(`[🔄] Mirror Switching -> ${data.videoId}`);
            player.loadVideoById(data.videoId, data.currentTime);
            return;
        }

        // 2. Sync Play/Pause state
        try {
            const localState = player.getPlayerState();
            if (data.isPlaying && localState !== 1) player.playVideo();
            if (!data.isPlaying && localState === 1) player.pauseVideo();

            // 3. Sync Time (Drift Correction)
            const localTime = player.getCurrentTime();
            const drift = Math.abs(localTime - data.currentTime);
            if (drift > 3) {
                console.log(`[⏱️] Drift Fix (${Math.round(drift)}s) for ${kidId}`);
                player.seekTo(data.currentTime, true);
            }
        } catch (e) {
            // Silently catch transient API errors during load
        }
    }
};

/**
 * YouTube API Global Callback
 */
window.onYouTubeIframeAPIReady = function() {
    console.log("[🌐] YouTube IFrame API Loaded.");
    if (window.ParentMirror && window.ParentMirror.pendingData) {
        Object.keys(window.ParentMirror.pendingData).forEach(kidId => {
            window.ParentMirror.handleSync(window.ParentMirror.pendingData[kidId]);
            delete window.ParentMirror.pendingData[kidId];
        });
    }
};

/**
 * Self-Initializing Socket Listener.
 */
(function initMirrorSocket() {
    const socket = window.socket || (window.ParentSocket ? window.ParentSocket.socket : null);

    if (socket) {
        console.log("[📡] Mirror Engine Listening...");
        socket.on('state_report', (data) => {
            if (window.ParentMirror) window.ParentMirror.handleSync(data);
        });
    } else {
        setTimeout(initMirrorSocket, 200);
    }
})();
// [/BLOCK: PARENT_MIRROR_ENGINE]