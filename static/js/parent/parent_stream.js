// static/js/parent/parent_stream.js
// [BLOCK: PARENT_STREAM_HANDLER]
/**
 * [AUDIT]
 * ROLE: Real-time Camera Stream Handler.
 * UPDATES:
 * - Event Sync: Listens for 'live_frame_update' to match the server-side relay.
 * - Data Mapping: Corrected to use 'data.image' as provided by kid_hardware.js.
 * - UI Safety: Manages placeholder toggling and live indicator visibility.
 */

(function() {
    const initializeStream = () => {
        // Access the shared socket from the main controller
        const socket = window.socket || (window.ParentSocket ? window.ParentSocket.socket : null);

        if (!socket) {
            // If socket isn't ready, retry in 100ms
            setTimeout(initializeStream, 100);
            return;
        }

        console.log("[📹] Stream Handler Linked. Monitoring Camera Feed...");

        /**
         * Process incoming video data.
         * The server relays 'kid_stream_frame' as 'live_frame_update'.
         */
        const handleIncomingFrame = (data) => {
            // Support both direct ID or fallback to default
            const kidId = data.kid_id || data.room;
            const frameData = data.image; // Matches kid_hardware.js emission

            if (!kidId || !frameData) return;

            const camImg = document.getElementById(`cam-feed-${kidId}`);
            const placeholder = document.getElementById(`placeholder-${kidId}`);
            const indicator = document.getElementById(`live-indicator-${kidId}`);

            if (camImg) {
                // Ensure base64 prefix exists; use existing if present
                camImg.src = frameData.startsWith('data:') ? frameData : 'data:image/jpeg;base64,' + frameData;

                // Toggle visibility on the very first successful frame
                if (camImg.style.display !== "block") {
                    camImg.style.display = "block";
                    if (placeholder) placeholder.style.display = 'none';
                    if (indicator) indicator.style.display = 'inline-block';
                    console.log(`[📹] Video Feed Rendering for ${kidId}`);
                }
            }
        };

        // Listen for the relay event from socket_events.py
        socket.on('live_frame_update', handleIncomingFrame);

        /**
         * Listen for High-Res Snapshots (Triggered by Parent or AI Monitor)
         */
        socket.on('new_snapshot', (data) => {
            console.log(`[📸] Snapshot Received for ${data.kid_id}`);
            const lastSnap = document.getElementById(`last-snap-${data.kid_id}`);
            if (lastSnap && data.image) {
                lastSnap.src = data.image.startsWith('data:') ? data.image : `/parent/vault/${data.image}`;
            }
        });
    };

    // Start the initialization loop
    initializeStream();
})();

/**
 * Global Helper for Snapshot/Stream Management
 */
window.ParentStream = {
    forceRefresh: (kidId) => {
        console.log(`[🔄] Manual refresh requested for Camera ${kidId}`);
        const indicator = document.getElementById(`live-indicator-${kidId}`);
        if (indicator) {
            indicator.style.color = "#fbbf24"; // Turn orange temporarily
            setTimeout(() => { indicator.style.color = "#ef4444"; }, 1000);
        }
    }
};
// [/BLOCK: PARENT_STREAM_HANDLER]