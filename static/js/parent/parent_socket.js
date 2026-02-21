// static/js/parent/parent_socket.js
// [BLOCK: PARENT_SOCKET_CORE]
/**
 * [AUDIT]
 * ROLE: Dashboard Communication Hub.
 * UPDATES:
 * - Payload Flattening: Optimized sendCmd to ensure server extraction works for volume/video.
 * - Event Sync: Fully aligned with the 'remote_command' relay logic in socket_events.py.
 * - Resilience: Robust string casting for room IDs.
 */

if (!window.socket) {
    window.socket = io({
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000
    });
}

const socket = window.socket;
const FALLBACK_KID_ID = "8660AC2E";

// --- REMOTE DEBUGGER ATTACHMENT ---
// This pipes Parent Dashboard logs directly to your Python terminal
const oldLog = console.log;
console.log = function(...args) {
    socket.emit('remote_log', {
        level: 'INFO',
        source: 'PARENT_DASHBOARD',
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')
    });
    oldLog.apply(console, args);
};

window.onerror = function(msg, url, line, col, error) {
    socket.emit('remote_log', {
        level: 'ERROR',
        source: 'PARENT_JS_CRASH',
        message: `${msg} | File: ${url} | Line: ${line}`
    });
};
// ----------------------------------

socket.on('connect', () => {
    console.log("✅ Dashboard Socket Connected. ID: " + socket.id);

    // 1. Gather Room IDs from the Dashboard UI
    const kidTiles = document.querySelectorAll('.kid-tile');
    let roomsToJoin = [];

    kidTiles.forEach(tile => {
        const id = tile.getAttribute('data-kid-id');
        if (id && id !== "KID_ID_HERE" && id.trim() !== "") {
            roomsToJoin.push(String(id).trim());
        }
    });

    // 2. Fallback if no tiles found
    if (roomsToJoin.length === 0) {
        roomsToJoin.push(String(FALLBACK_KID_ID));
    }

    // 3. Join Rooms as 'parent' to receive syncs and frames
    roomsToJoin.forEach(roomId => {
        console.log(`[📡] Joining Room: ${roomId} as Parent`);
        socket.emit('join', { room: roomId, role: 'parent' });
    });
});

/**
 * Universal Command Emitter (Downlink)
 * Sends commands like 'play', 'pause', 'volume_set', or 'load_video'.
 */
window.sendCmd = function(kidId, command, payload = {}) {
    const targetId = String(kidId || FALLBACK_KID_ID).trim();
    console.log(`[🚀] Dashboard -> Server: ${command}`, payload);

    // Flattens the payload into the main object so the server can
    // easily extract k:v pairs for the kid portal.
    socket.emit('parent_command', {
        room: targetId,
        command: command,
        ...payload
    });
};

/**
 * [LIVE SYNC LISTENER] (Uplink)
 * Receives the state_report from the Kid via Server relay.
 */
socket.on('state_report', (data) => {
    console.log(`[📥] SYNC RECEIVED for ${data.room}: Video ${data.videoId} at ${data.currentTime}s`);

    if (window.ParentMirror) {
        window.ParentMirror.handleSync(data);
    } else {
        oldLog.warn("[⚠️] ParentMirror module not found on window.");
    }
});

/**
 * Status Listeners (Online/Offline badges)
 */
socket.on('status_change', (data) => {
    const kidId = data.kid_id;
    const badge = document.getElementById(`status-badge-${kidId}`);
    if (badge) {
        badge.className = data.online ? "status-badge status-online" : "status-badge status-offline";
        badge.innerText = data.online ? "ONLINE" : "OFFLINE";
    }
    console.log(`[📡] Kid ${kidId} Status Update: ${data.online ? 'ONLINE' : 'OFFLINE'}`);
});

/**
 * Snapshot/Vault Listener
 */
socket.on('new_snapshot', (data) => {
    console.log("[📸] New Snapshot notification received.");
    // Update stream handler if it has a snapshot UI update function
    if (window.ParentStream && typeof window.ParentStream.handleNewSnapshot === 'function') {
        window.ParentStream.handleNewSnapshot(data);
    }
});

socket.on('disconnect', (reason) => {
    oldLog.error("[❌] Dashboard Socket Disconnected: " + reason);
});

// Global Namespace for other modules
window.ParentSocket = {
    socket,
    DEFAULT_KID_ID: FALLBACK_KID_ID,
    sendCmd: window.sendCmd
};
// [/BLOCK: PARENT_SOCKET_CORE]