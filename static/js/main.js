// Global Socket Initialization
const socket = io();

socket.on('connect', () => {
    console.log("[+] Connected to KiddieControl Server");
});

socket.on('disconnect', () => {
    console.log("[-] Disconnected from Server");
});

// Helper to join a specific kid room
function joinKidRoom(kidId) {
    socket.emit('join', { kid_id: kidId });
}