// static/js/kid/kid_player.js
// [BLOCK: KID_YOUTUBE_ENGINE]
/**
 * [AUDIT]
 * ROLE: Kid Portal YouTube Controller.
 * VERSION: 2.7 (Restored Playlist Logic)
 * LAST_CHANGE: Reverted to type-based playlist detection to fix switching issues.
 */
window.onYouTubeIframeAPIReady = function() {
    console.log("[📺] YouTube API Engine Ready.");

    const cleanOrigin = window.location.origin.replace(/\/$/, "");
    const settings = window.kidSettings?.playback || { current_video: '5qap5aO4i9A', media_type: 'video' };

    const playerOptions = {
        height: '100%',
        width: '100%',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'mute': 1,
            'enablejsapi': 1,
            'origin': cleanOrigin,
            'widget_referrer': cleanOrigin,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': (event) => {
                console.log("[✅] Kid Player Ready. Handshake successful.");

                // Initial load from server-side persistent settings
                if (settings.media_type === 'playlist') {
                    event.target.loadPlaylist({ list: settings.current_video });
                } else {
                    event.target.loadVideoById(settings.current_video);
                }

                // Autoplay bypass
                setTimeout(() => {
                    if (window.player && typeof window.player.unMute === 'function') {
                        window.player.playVideo();
                        setTimeout(() => {
                            window.player.unMute();
                            window.player.setVolume(100);
                        }, 500);
                    }
                }, 1500);

                window.KidPlayer.setupSocketListeners();
                window.KidPlayer.reportState();
            },
            'onStateChange': (event) => {
                window.KidPlayer.reportState();
            },
            'onError': (event) => {
                console.error("[❌] YouTube Player Error:", event.data);
            }
        }
    };
    window.player = new YT.Player('yt-player', playerOptions);
};

window.KidPlayer = {
    setupSocketListeners: function() {
        const socket = window.socket || window.KidSocket?.socket;
        if (!socket) {
            setTimeout(() => this.setupSocketListeners(), 500);
            return;
        }

        socket.on('remote_command', (data) => {
            console.log("[🎮] Incoming Remote Command:", data);
            this.handleCommand(data.command, data.payload || data);
        });
    },

    reportState: () => {
        if (!window.player || typeof window.player.getCurrentTime !== 'function') return;

        try {
            const videoData = window.player.getVideoData();
            const vId = (videoData && videoData.video_id) ? videoData.video_id : null;
            const activeSocket = window.socket || window.KidSocket?.socket;
            const roomId = window.KidSocket?.MY_ID || "8660AC2E";

            if (vId && activeSocket && activeSocket.connected) {
                const syncData = {
                    room: roomId,
                    videoId: vId,
                    currentTime: window.player.getCurrentTime(),
                    duration: window.player.getDuration(),
                    volume: window.player.getVolume(),
                    isPlaying: window.player.getPlayerState() === 1,
                    timestamp: Date.now()
                };
                activeSocket.emit('state_report', syncData);
            }
        } catch (err) {
            console.warn("[⚠️] State report failed:", err);
        }
    },

    handleCommand: function(command, payload) {
        if (!window.player || typeof window.player.playVideo !== 'function') return;

        // Extract payload regardless of nesting
        const data = payload?.payload || payload;

        switch(command) {
            case 'play':
                window.player.playVideo();
                window.player.unMute();
                break;
            case 'pause':
                window.player.pauseVideo();
                break;
            case 'volume_set':
                const vol = Math.min(Math.max(data.level ?? data.volume ?? 100, 0), 100);
                window.player.setVolume(vol);
                if (vol > 0) window.player.unMute();
                break;
            case 'seek_relative':
                const seconds = data.seconds ?? 0;
                window.player.seekTo(window.player.getCurrentTime() + seconds, true);
                break;

            // --- RESTORED PLAYLIST / VIDEO SWITCHING ---
            case 'load_video':
            case 'playlist_sync':
            case 'push_video':
                // Detect playlist status based on the media_type flag or ID key
                const isPlaylist = data.type === 'playlist' || data.media_type === 'playlist' || !!data.playlistId;
                const contentId = data.videoId || data.video_id || data.playlistId || data.list || data.url;

                if (isPlaylist && contentId) {
                    console.log("[📂] Switching to Playlist:", contentId);
                    window.player.loadPlaylist({
                        list: contentId,
                        listType: 'playlist',
                        index: 0
                    });
                } else if (contentId) {
                    console.log("[🎥] Switching to Video:", contentId);
                    window.player.loadVideoById(contentId);
                }

                window.player.unMute();
                window.player.setVolume(100);
                break;
            // ----------------------------------------------
        }

        // Quick update to dashboard mirror
        setTimeout(() => this.reportState(), 600);
    }
};

setInterval(() => {
    if (window.KidPlayer) window.KidPlayer.reportState();
}, 4000);
// [/BLOCK: KID_YOUTUBE_ENGINE]