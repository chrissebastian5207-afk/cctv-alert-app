// Always use WebSocket transport for real-time alerts
const socket = io({
    transports: ["websocket"],
    reconnection: true
});

console.log("📡 Socket connecting...");

// We create the audio object ONLY after user interacts (mobile autoplay rule)
let alertSound;

// Unlock sound on first click / tap
document.addEventListener("click", function () {
    if (!alertSound) {
        alertSound = new Audio("/static/sounds/beep.mp3");
        alertSound.load();
        console.log("🔊 Sound unlocked for alerts");
    }
}, { once: true });

socket.on("connect", () => {
    console.log("✅ Socket connected");
});

socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
});

// When server sends a new alert
socket.on("new_alert", alert => {
    console.log("🚨 New Alert:", alert);

    // Play sound (only after unlocked)
    if (alertSound) {
        try {
            alertSound.currentTime = 0;
            alertSound.play();
        } catch (e) {
            console.log("⚠️ Sound blocked until user taps once");
        }
    }

    // Vibrate (mobile devices)
    if (navigator.vibrate) {
        navigator.vibrate([200, 120, 200]);
    }

    // UI update in dashboard
    const list = document.getElementById("recent-list");
    if (list) {
        const node = document.createElement("div");
        node.className = "list-group-item d-flex justify-content-between align-items-start";

        node.innerHTML = `
        <div class="ms-2 me-auto">
            <div class="fw-bold">${alert.title}</div>
            <div class="small text-muted">${alert.message}</div>
        </div>
        <span class="badge bg-secondary">${new Date(alert.timestamp).toLocaleString()}</span>
        `;

        list.prepend(node);
    }
});
