// static/js/kid/kid_monitor.js
// [BLOCK: KID_AUDIO_MONITOR]
window.KidMonitor = {
    setup: function(stream) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                let average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                if (average > 100) {
                    console.log("🔊 Cry Detected!");
                    if (window.KidHardware) window.KidHardware.captureAndSend();
                }
            }, 3000);
        } catch(e) { console.error("Audio Context failed:", e); }
    }
};
// [/BLOCK: KID_AUDIO_MONITOR]