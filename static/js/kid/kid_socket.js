// static/js/kid/kid_socket.js
// [BLOCK: KID_SOCKET_CORE]
/**
 * [AUDIT]
 * ROLE: Kid Portal Communication Hub.
 * UPDATES:
 * - Remote Logging: Pipes Kid-side logs and errors to the Python terminal.
 * - Event Alignment: Listens for 'player_control' to match server-side relay.
 * - ID Stability: Robust room ID extraction.
 */

if (!window.socket) {
    window.socket = io({
        transports: ['websocket', 'polling'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 15
    });
}

const socket = window.socket;
const MY_ID = typeof KID_ID !== 'undefined' ? KID_ID : (window.location.pathname.split('/').pop() || "8660AC2E");

// --- REMOTE DEBUGGER ATTACHMENT ---
const oldLog = console.log;
console.log = function(...args) {
    socket.emit('remote_log', {
        level: 'INFO',
        source: 'KID_PORTAL',
        message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')
    });
    oldLog.apply(console, args);
};

window.onerror = function(msg, url, line) {
    socket.emit('remote_log', {
        level: 'ERROR',
        source: 'KID_JS_CRASH',
        message: `${msg} | Line: ${line}`
    });
};
// ----------------------------------

socket.on('connect', () => {
    console.log(`[🔌] KID SOCKET CONNECTED! ID: ${socket.id}`);
    socket.emit('join', { room: String(MY_ID), role: 'kid' });
});

/**
 * Main Command Receiver
 * Listens for 'player_control' from the Parent Dashboard.
 */
socket.on('player_control', async (data) => {
    const { command, payload } = data;
    console.log(`[📩] Command Received: ${command}`, payload);

    // ROUTING SYSTEM
    switch(command) {
        case 'play':
        case 'pause':
        case 'load_video':
        case 'playlist_sync':
        case 'volume_set':
        case 'seek_relative':
        case 'seek_to':
            if (window.KidPlayer) {
                window.KidPlayer.handleCommand(command, payload);
            } else {
                console.warn("[⚠️] KidPlayer module not ready for command:", command);
            }
            break;

        case 'request_snapshot':
            if (window.KidHardware) {
                window.KidHardware.handleSnapshotRequest();
            }
            break;

        case 'switch_mode':
            if (payload && payload.night_mode !== undefined) {
                document.body.style.filter = payload.night_mode ? "brightness(40%)" : "brightness(100%)";
                console.log("[🌙] Night Mode:", payload.night_mode);
            }
            break;

        default:
            console.log("[❓] Unknown command type:", command);
    }
});

socket.on('disconnect', (reason) => {
    oldLog.error("[❌] Kid Socket Disconnected: " + reason);
});

window.KidSocket = { socket, MY_ID };
// [/BLOCK: KID_SOCKET_CORE]