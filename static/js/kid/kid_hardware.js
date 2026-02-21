// static/js/kid/kid_hardware.js
// [BLOCK: KID_HARDWARE_CONTROLLER]
window.KidHardware = {
    activeStream: null,

    init: async function() {
        console.log("[📹] Initializing Hardware...");
        const statusEl = document.getElementById('mic-status');
        if (statusEl) statusEl.innerText = "Syncing Hardware...";

        try {
            this.activeStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { width: 640, height: 480, facingMode: "user" }
            });
            const vid = document.getElementById('localVideo');
            if (vid) vid.srcObject = this.activeStream;
            if (statusEl) statusEl.innerText = "Monitoring: ACTIVE ✅";

            if (window.KidMonitor) window.KidMonitor.setup(this.activeStream);
            this.startFastStream();
            window.activeStream = this.activeStream;
        } catch (err) {
            console.error("Hardware Blocked:", err);
            if (statusEl) statusEl.innerText = "Hardware Blocked ❌";
        }
    },

    handleSnapshotRequest: async function() {
        if (!this.activeStream) await this.init();
        const vid = document.getElementById('localVideo');
        if (vid) {
            vid.style.display = 'block';
            setTimeout(() => { this.captureAndSend(); vid.style.display = 'none'; }, 1000);
        }
    },

    captureAndSend: function() {
        const video = document.getElementById('localVideo');
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').drawImage(video, 0, 0);
        if (window.KidSocket?.socket.connected) {
            window.KidSocket.socket.emit('new_snapshot', {
                room: window.KidSocket.MY_ID,
                image: canvas.toDataURL('image/jpeg', 0.8)
            });
        }
    },

    startFastStream: function() {
        const streamCanvas = document.createElement('canvas');
        const ctx = streamCanvas.getContext('2d');
        const video = document.getElementById('localVideo');
        setInterval(() => {
            if (window.KidSocket?.socket.connected && video.readyState === 4) {
                streamCanvas.width = 320; streamCanvas.height = 240;
                ctx.drawImage(video, 0, 0, 320, 240);
                window.KidSocket.socket.emit('kid_stream_frame', {
                    room: window.KidSocket.MY_ID,
                    image: streamCanvas.toDataURL('image/jpeg', 0.3)
                });
            }
        }, 200);
    }
};

window.startCryDetection = () => window.KidHardware.init();
// [/BLOCK: KID_HARDWARE_CONTROLLER]