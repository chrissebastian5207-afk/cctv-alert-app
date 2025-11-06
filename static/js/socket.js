// static/js/socket.js
// Tactical Military UI realtime client: sound, vibrate, UI prepend, safe-escaping.

const socket = io({
  transports: ["websocket"],
  reconnection: true
});

let alertSound = null;
let soundUnlocked = false;

function createAudio() {
  try {
    alertSound = new Audio("/static/sounds/alert.wav");
    alertSound.preload = "auto";
    alertSound.volume = 1.0;
  } catch (e) {
    console.warn("Audio create failed", e);
    alertSound = null;
  }
}

function unlockSoundOnce() {
  if (soundUnlocked) return;
  soundUnlocked = true;
  if (!alertSound) createAudio();
  if (!alertSound) return;
  alertSound.play().then(() => {
    alertSound.pause();
    alertSound.currentTime = 0;
    console.log("🔊 Sound unlocked");
  }).catch((err) => {
    console.warn("Sound unlock blocked:", err);
  });
}

document.addEventListener("click", unlockSoundOnce, { once: true, passive: true });
document.addEventListener("touchstart", unlockSoundOnce, { once: true, passive: true });

// create early
createAudio();

socket.on("connect", () => console.log("✅ Socket connected"));
socket.on("disconnect", () => console.log("❌ Socket disconnected"));

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;",
      "=": "&#61;",
      "/": "&#47;"
    })[s];
  });
}

function addAlertToUI(alert) {
  const list = document.getElementById("recent-list");
  if (!list) return;

  const node = document.createElement("div");
  node.className = "list-group-item d-flex justify-content-between align-items-start alert-row";

  const left = document.createElement("div");
  left.className = "ms-2 me-auto";

  const title = document.createElement("div");
  title.className = "fw-bold alert-title";
  title.textContent = escapeHtml(alert.title);

  const msg = document.createElement("div");
  msg.className = "small text-muted alert-message";
  msg.textContent = escapeHtml(alert.message);

  left.appendChild(title);
  left.appendChild(msg);

  const time = document.createElement("span");
  time.className = "badge rounded-pill alert-time";
  try {
    time.textContent = new Date(alert.timestamp).toLocaleString();
  } catch (e) {
    time.textContent = alert.timestamp ? alert.timestamp.slice(0, 19).replace("T", " ") : "";
  }

  node.appendChild(left);
  node.appendChild(time);

  list.prepend(node);
}

socket.on("new_alert", (alert) => {
  console.log("🚨 new_alert", alert);

  // sound
  if (alertSound) {
    try {
      alertSound.currentTime = 0;
      const play = alertSound.play();
      if (play && typeof play.catch === "function") play.catch(() => {});
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  // vibrate
  if (navigator.vibrate) {
    try { navigator.vibrate([250, 120, 250]); } catch (e) {}
  }

  addAlertToUI(alert);
});
