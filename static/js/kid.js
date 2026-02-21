/**
 * [AUDIT]
 * FILE: static/js/kid.js
 * ROLE: Kid Portal logic - Handles YouTube Engine, Camera hardware, and Socket commands.
 * VERSION: 7.8 (Sentinel Universal - Full Feature Set)
 * LAST_CHANGE: Fixed socket scoping for high-speed stream while preserving all 259-line features.
 */

(function() {
    // [BLOCK: SOCKET_INIT]
    const socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10
    });

    // Handle dynamic ID or fallback
    const MY_ID = typeof KID_ID !== 'undefined' ? KID_ID : (window.location.pathname.split('/').pop() || "8660AC2E");
    let player;
    let activeStream = null;
    // [/BLOCK: SOCKET_INIT]

    // --- 1. SOCKET CONNECTION ---
    socket.on('connect', () => {
        console.log(`[🔌] SOCKET CONNECTED! ID: ${socket.id}`);
        socket.emit('join', { room: MY_ID, role: 'kid' });
    });

    socket.on('remote_command', async (data) => {
        const { command, payload } = data;
        console.log(`[📩] Command Received: ${command}`, payload);

        // Ensure player exists for playback commands
        if (!player && !['snapshot', 'simulate_cry', 'request_snapshot', 'night_mode'].includes(command)) return;

        switch(command) {
            case 'play':
                player.playVideo();
                player.unMute();
                player.setVolume(100);
                break;
            case 'pause':
                player.pauseVideo();
                break;

            case 'load_video':
            case 'playlist_sync':
                syncMedia(payload.video_id, payload.type === 'playlist');
                break;

            case 'snapshot':
            case 'simulate_cry':
            case 'request_snapshot':
                handleSnapshotRequest();
                break;

            case 'night_mode':
                document.body.style.filter = payload.enabled ? "brightness(30%)" : "brightness(100%)";
                break;
        }
    });

    /**
     * Helper to route media loading correctly and ensure audio follows
     */
    function syncMedia(mediaId, isPlaylist) {
        if (!player) return;

        if (isPlaylist) {
            console.log("[🎵] Loading Playlist:", mediaId);
            player.loadPlaylist({
                list: mediaId,
                listType: 'playlist',
                index: 0,
                suggestedQuality: 'large'
            });
        } else {
            console.log("[📺] Loading Single Video:", mediaId);
            player.loadVideoById(mediaId);
        }

        player.unMute();
        player.setVolume(100);
        player.playVideo();
    }

    // --- 2. HARDWARE (CAMERA & AUDIO) ---
    async function handleSnapshotRequest() {
        if (!activeStream) await window.startCryDetection();

        if (activeStream) {
            showLocalVideo();
            // Wait for camera to warm up then capture high-res
            setTimeout(() => { captureAndSendSnapshot(); }, 1000);
        } else {
            updateStatus("Camera Error ❌");
        }
    }

    window.startCryDetection = async function() {
        updateStatus("Syncing Hardware...");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatus("Use HTTPS/Ngrok! 🔒");
            return;
        }

        try {
            activeStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { width: 640, height: 480, facingMode: "user" }
            });
            const vid = document.getElementById('localVideo');
            if (vid) vid.srcObject = activeStream;
            updateStatus("Monitoring: ACTIVE ✅");
            setupAudioAnalysis(activeStream);

            // Link to the global scope for the fast stream engine
            window.activeStream = activeStream;
        } catch (err) {
            console.error("Hardware Blocked:", err);
            updateStatus("Hardware Blocked ❌");
        }
    };

    async function captureAndSendSnapshot() {
        const video = document.getElementById('localVideo');
        if (!video || !video.srcObject) return;

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext('2d').drawImage(video, 0, 0);

        // Emit to the snapshot-specific listener on server
        socket.emit('new_snapshot', {
            room: MY_ID,
            kid_id: MY_ID,
            image: canvas.toDataURL('image/jpeg', 0.8)
        });
        console.log("📸 Manual Snapshot Sent to Server");
    }

    // --- 3. YOUTUBE ENGINE & SYNC REPORTER ---
    window.onYouTubeIframeAPIReady = function() {
        console.log("[📺] YouTube API Engine Ready.");

        const bootVideo = (window.kidSettings && window.kidSettings.playback)
                          ? window.kidSettings.playback.current_video
                          : '5qap5aO4i9A';

        const bootType = (window.kidSettings && window.kidSettings.playback)
                         ? window.kidSettings.playback.media_type
                         : 'video';

        const playerOptions = {
            height: '100%',
            width: '100%',
            playerVars: {
                'autoplay': 1,
                'controls': 0,
                'mute': 1,
                'rel': 0,
                'showinfo': 0,
                'iv_load_policy': 3,
                'modestbranding': 1,
                'origin': window.location.origin,
                'enablejsapi': 1
            },
            events: {
                'onReady': (event) => {
                    console.log("[✅] Player ready. Triggering Autoplay sequence.");
                    event.target.playVideo();
                    setTimeout(() => {
                        event.target.unMute();
                        event.target.setVolume(100);
                        event.target.playVideo();
                    }, 1500);

                    if (bootType === 'playlist') {
                        event.target.loadPlaylist({ list: bootVideo, listType: 'playlist' });
                    } else {
                        event.target.cueVideoById(bootVideo);
                    }
                },
                'onStateChange': (event) => {
                    if (socket && socket.connected) {
                        socket.emit('kid_state_update', {
                            room: MY_ID,
                            videoId: player.getVideoData().video_id,
                            time: player.getCurrentTime(),
                            state: event.data
                        });
                    }
                }
            }
        };

        player = new YT.Player('yt-player', playerOptions);
        window.player = player;
    };

    function setupAudioAnalysis(stream) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            const microphone = audioCtx.createMediaStreamSource(stream);
            microphone.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                let average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                if (average > 100) {
                    console.log("🔊 Cry Detected! Auto-capturing...");
                    captureAndSendSnapshot();
                }
            }, 3000);
        } catch(e) { console.error("Audio Context failed:", e); }
    }

    function updateStatus(text) {
        const el = document.getElementById('mic-status');
        if (el) el.innerText = text;
    }

    function showLocalVideo() {
        const vid = document.getElementById('localVideo');
        if (vid) {
            vid.style.display = 'block';
            setTimeout(() => { vid.style.display = 'none'; }, 4000);
        }
    }

    // --- 4. HIGH-SPEED LIVE STREAM ENGINE ---
    // Moved INSIDE the closure to access the 'socket' variable directly
    async function initFastStream() {
        const streamVid = document.createElement('video');
        const streamCanvas = document.createElement('canvas');
        const ctx = streamCanvas.getContext('2d');

        try {
            // Check if we already have a stream from startCryDetection
            let stream = activeStream;
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 480, height: 360 }
                });
                activeStream = stream;
            }

            streamVid.srcObject = stream;
            streamVid.muted = true;
            streamVid.play();

            console.log("[📹] High-Speed Stream Engine Started (0.2s interval).");

            setInterval(() => {
                if (socket && socket.connected && streamVid.readyState === 4) {
                    streamCanvas.width = 320; // Optimized for Ngrok
                    streamCanvas.height = 240;
                    ctx.drawImage(streamVid, 0, 0, streamCanvas.width, streamCanvas.height);

                    const dataUrl = streamCanvas.toDataURL('image/jpeg', 0.3);
                    socket.emit('kid_stream_frame', {
                        room: MY_ID,
                        image: dataUrl
                    });
                }
            }, 200);

        } catch (err) {
            console.error("[❌] Fast Stream Failed:", err);
        }
    }

    // Start everything
    setTimeout(initFastStream, 2000);
    console.log("🚀 kid.js V7.8 (Mirror Sync) Active.");

})();