// static/js/parent/parent_vault.js
// [BLOCK: PARENT_VAULT_MANAGER]
/**
 * [AUDIT]
 * ROLE: Snapshot Archive & Library UI Manager.
 * VERSION: 2.8 (Corrected Sync Relay)
 * LAST_CHANGE: Fixed payload to send actual YouTube IDs (video_id) to the Kid Portal.
 */

window.ParentVault = {
    /**
     * Handles the assignment of a playlist to a specific child/mode.
     * Triggered by the dropdowns in parent.html
     */
    assignPlaylist: async function(kidId, mode, libraryId) {
        console.log(`[📚] Requesting Assignment: ${libraryId} -> ${kidId} (${mode})`);

        try {
            // 1. Update the Database via API
            // This returns the actual YouTube URL/ID and media type
            const response = await fetch('/parent/api/library/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kid_id: kidId,
                    mode: mode,
                    library_id: libraryId
                })
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                console.log(`[✅] Library Saved. Result:`, result);

                // 2. FIXED: Tell the Tablet to load the new video/playlist IMMEDIATELY
                // We send result.video_id (The YT ID) and result.media_type (video/playlist)
                if (window.ParentSocket && typeof window.ParentSocket.sendCmd === 'function') {
                    console.log(`[🚀] Dashboard -> Server: playlist_sync for ${kidId} (YT ID: ${result.video_id})`);

                    window.ParentSocket.sendCmd(kidId, 'playlist_sync', {
                        videoId: result.video_id,  // The actual YT ID from the server
                        type: result.media_type,   // 'playlist' or 'video'
                        mode: mode
                    });
                }
            } else {
                console.error(`[❌] Library Sync Failed: ${result.message}`);
            }
        } catch (err) {
            console.error("[❌] Network error during library assignment:", err);
        }
    },

    handleSnapshot: function(data) {
        // Fallback for ID if not provided in payload
        const kidId = data.kid_id || (window.ParentSocket ? window.ParentSocket.DEFAULT_KID_ID : "8660AC2E");
        console.log(`[📸] Vault Processing Snapshot for: ${kidId}`);

        // Update the live feed image in the tile
        const camImg = document.getElementById(`cam-feed-${kidId}`);
        const placeholder = document.getElementById(`placeholder-${kidId}`);
        const indicator = document.getElementById(`live-indicator-${kidId}`);

        if (camImg && data.image) {
            camImg.src = data.image;
            camImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            if (indicator) indicator.style.display = 'inline-block';
        }

        this.addToGallery(data);
        this.playAlert();
    },

    addToGallery: function(data) {
        const gallery = document.getElementById('vault-gallery');
        if (!gallery) return;

        // Clean up empty states
        if (gallery.innerHTML.includes("History") || gallery.innerHTML.includes("No snapshots")) {
            gallery.innerHTML = '';
        }

        const itemHtml = `
            <div class="col animate__animated animate__fadeIn">
                <div class="card h-100" style="background: #1e293b; border: 1px solid #334155;">
                    <img src="${data.image}" class="card-img-top p-1" style="height:100px; object-fit:cover; border-radius: 8px;">
                    <div class="card-footer p-1 text-center" style="border-top: 1px solid #334155;">
                        <small style="color: #94a3b8; font-size: 0.7rem;">${new Date().toLocaleTimeString()}</small>
                    </div>
                </div>
            </div>`;

        gallery.insertAdjacentHTML('afterbegin', itemHtml);
    },

    playAlert: function() {
        // Non-intrusive notification sound
        new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
    },

    refreshLibraryUI: async function() {
        /** Useful if we add items via a modal and need to refresh dropdowns without reloading */
        try {
            const response = await fetch('/parent/api/library/get_all');
            const library = await response.json();
            document.querySelectorAll('.library-select').forEach(select => {
                const currentVal = select.value;
                select.innerHTML = '<option value="">-- Select from Vault --</option>';
                Object.entries(library).forEach(([id, item]) => {
                    const opt = new Option(item.name, id);
                    if (id === currentVal) opt.selected = true;
                    select.add(opt);
                });
            });
        } catch (err) {
            console.error("Library Sync Error:", err);
        }
    }
};

// --- DEFENSIVE SOCKET ATTACHMENT ---
/** Ensures the vault logic listens for snapshots as soon as the socket is active */
(function initVault() {
    const socket = window.socket || (window.ParentSocket ? window.ParentSocket.socket : null);
    if (!socket) {
        setTimeout(initVault, 100);
        return;
    }
    socket.on('new_snapshot', (data) => {
        window.ParentVault.handleSnapshot(data);
    });
})();
// [/BLOCK: PARENT_VAULT_MANAGER]