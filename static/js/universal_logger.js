// static/js/universal_logger.js
(function() {
    const source = window.location.pathname.includes('kid') ? 'KID' : 'PARENT';

    // Capture standard logs
    const oldLog = console.log;
    console.log = function(...args) {
        if (window.socket && window.socket.connected) {
            window.socket.emit('remote_log', { level: 'LOG', source: source, message: args.join(' ') });
        }
        oldLog.apply(console, args);
    };

    // Capture CRITICAL Errors (like the one you just had)
    window.onerror = function(message, sourceFile, lineno, colno, error) {
        const errorMsg = `${message} at ${sourceFile}:${lineno}`;
        if (window.socket && window.socket.connected) {
            window.socket.emit('remote_log', { level: 'ERROR', source: source, message: errorMsg });
        }
    };

    console.log("🚀 Remote Debugger Active for " + source);
})();