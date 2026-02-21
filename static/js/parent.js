/**
 * [AUDIT]
 * FILE: static/js/parent.js
 * ROLE: Dashboard logic - Role-aware identity, Remote Controls, and Dual-View Mirror.
 * VERSION: 6.2 (Production Sentinel Stream)
 * LAST_CHANGE: Optimized for cross-origin ngrok streams and forced element visibility.
 */

(function() {
    // [BLOCK: SOCKET_INIT]
    if (!window.socket) {
        window.socket = io({
            transports: ['websocket', 'polling'],
            upgrade: true
        });
    }
    const socket = window.socket;
    const DEFAULT_KID_ID = "8660AC2E";
    let mirrorPlayers = {};

    socket.on('connect', () => {
        console.log("✅ Dashboard Socket Connected. Joining as PARENT.");
        // We join the parent_admin group via the 'join' event in app.py
        socket.emit('join', { room: DEFAULT_KID_ID, role: 'parent' });
    });
    // [/BLOCK: SOCKET_INIT]

    // [BLOCK: MIRROR_ENGINE]
    socket.on('player_state_sync', (data) => {
        const kidId = data.room || DEFAULT_KID_ID;
        const mirrorId = `yt-mirror-${kidId}`;
        const placeholder = document.getElementById(`mirror-placeholder-${kidId}`);

        if (!data.videoId || data.videoId === "undefined" || data.videoId === "null") return;

        if (!mirrorPlayers[kidId]) {
            if (typeof YT === 'undefined' || !YT.Player) return;

            mirrorPlayers[kidId] = new YT.Player(mirrorId, {
                height: '100%',
                width: '100%',
                videoId: data.videoId,
                playerVars: {
                    'controls': 0,
                    'mute': 1,
                    'rel': 0,
                    'origin': window.location.origin,
                    'enablejsapi': 1
                },
                events: {
                    'onReady': (e) => {
                        if (placeholder) placeholder.style.display = 'none';
                        e.target.seekTo(data.time);
                        if (data.state === 1) e.target.playVideo();
                    }
                }
            });
        } else {
            const p = mirrorPlayers[kidId];
            if (!p.loadVideoById || !p.getVideoData) return;
            if (placeholder) placeholder.style.display = 'none';

            const currentVideoId = p.getVideoData().video_id;
            if (currentVideoId !== data.videoId) {
                p.loadVideoById(data.videoId, data.time);
            }

            if (data.state === 1) p.playVideo();
            else p.pauseVideo();

            const timeDiff = Math.abs(p.getCurrentTime() - data.time);
            if (timeDiff > 3) p.seekTo(data.time, true);
        }
    });
    // [/BLOCK: MIRROR_ENGINE]

    // [BLOCK: HIGH_SPEED_STREAM_LISTENER]
    /**
     * Catches the 0.2s frequency frames.
     * Forces the image to show even if the browser tries to hide 'unsourced' images.
     */
    socket.on('live_frame_update', (data) => {
        const kidId = data.kid_id || DEFAULT_KID_ID;
        const camImg = document.getElementById(`cam-feed-${kidId}`);
        const placeholder = document.getElementById(`placeholder-${kidId}`);
        const indicator = document.getElementById(`live-indicator-${kidId}`);
        const wrapper = document.getElementById(`snapshot-wrapper-${kidId}`);

        if (camImg && data.image) {
            // Update the image source
            camImg.src = data.image;

            // Forced Visibility: Bypass any potential CSS blocks
            if (camImg.style.display !== "block") {
                camImg.style.display = "block";
                if (placeholder) placeholder.style.display = 'none';
                console.log(`[📹] Stream Active for ${kidId}`);
            }

            // UI Decoration
            if (indicator) indicator.style.display = 'inline-block';
            if (wrapper && !wrapper.classList.contains('streaming-active')) {
                wrapper.classList.add('streaming-active');
            }
        }
    });
    // [/BLOCK: HIGH_SPEED_STREAM_LISTENER]

    // [BLOCK: COMMAND_EMITTERS]
    window.sendCmd = function(kidId, command, payload = {}) {
        const targetId = kidId || DEFAULT_KID_ID;
        console.log(`[🚀] Sending ${command} to ${targetId}`, payload);

        socket.emit('parent_command', {
            room: targetId,
            command: command,
            payload: payload
        });
    };
    // [/BLOCK: COMMAND_EMITTERS]

    // [BLOCK: STATUS_LISTENERS]
    socket.on('status_change', (data) => {
        const kidId = data.kid_id || DEFAULT_KID_ID;
        const badge = document.getElementById(`status-badge-${kidId}`);
        if (badge) {
            badge.className = data.online ? "status-badge status-online" : "status-badge status-offline";
            badge.innerText = data.online ? "ONLINE" : "OFFLINE";
        }
    });
    // [/BLOCK: STATUS_LISTENERS]

    // [BLOCK: SNAPSHOT_HANDLING]
    socket.on('new_snapshot', (data) => {
        const kidId = data.kid_id || DEFAULT_KID_ID;
        // Update the main camera view with the high-res snapshot immediately
        const camImg = document.getElementById(`cam-feed-${kidId}`);
        if (camImg && data.image) {
            camImg.src = data.image;
        }

        addToVaultGallery(data);
        playAlertSound();
    });

    function addToVaultGallery(data) {
        const gallery = document.getElementById('vault-gallery');
        if (!gallery) return;
        if (gallery.innerHTML.includes("History")) gallery.innerHTML = '';

        const timestamp = new Date().toLocaleTimeString();
        const itemHtml = `
            <div class="col animate__animated animate__fadeIn">
                <div class="card h-100" style="background: #1e293b; border: 1px solid #334155;">
                    <img src="${data.image}" class="card-img-top p-1" style="height:100px; object-fit:cover;">
                    <div class="card-footer p-1 text-center">
                        <small style="color: #94a3b8; font-size: 0.7rem;">${timestamp}</small>
                    </div>
                </div>
            </div>`;
        gallery.insertAdjacentHTML('afterbegin', itemHtml);
    }

    function playAlertSound() {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(() => {});
    }
    // [/BLOCK: SNAPSHOT_HANDLING]

    console.log("🚀 parent.js V6.2 (Production Sentinel) loaded.");
})();

// [BLOCK: LIBRARY_UI_SYNC]
async function refreshLibraryUI() {
    try {
        const response = await fetch('/api/library/get_all');
        const library = await response.json();
        const selects = document.querySelectorAll('.library-select');
        selects.forEach(select => {
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- Select from Vault --</option>';
            Object.entries(library).forEach(([id, item]) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = item.name;
                if (id === currentVal) opt.selected = true;
                select.appendChild(opt);
            });
        });
    } catch (err) { console.error("Library Sync Error:", err); }
}

socket.on('library_update', (data) => {
    refreshLibraryUI();
});
// [/BLOCK: LIBRARY_UI_SYNC]