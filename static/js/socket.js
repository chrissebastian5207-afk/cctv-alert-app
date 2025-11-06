// static/js/socket.js
// Real-time socket + audio unlock + UI update
const socket = io({ transports: ['websocket'], reconnection: true });

let alertSound = null;
let soundUnlocked = false;

// Create audio object but don't play until unlocked
function createAudio() {
  try {
    alertSound = new Audio('/static/sounds/alert.wav');
    alertSound.preload = 'auto';
    alertSound.volume = 1.0;
  } catch (e) {
    console.warn('Audio creation failed', e);
    alertSound = null;
  }
}

// Unlock audio on first user gesture (required by browsers)
function unlockSoundOnce() {
  if (soundUnlocked) return;
  soundUnlocked = true;
  if (!alertSound) createAudio();
  if (!alertSound) return;
  alertSound.play().then(() => {
    alertSound.pause();
    alertSound.currentTime = 0;
    console.log('🔊 Sound unlocked');
  }).catch((err) => {
    console.warn('Sound unlock blocked:', err);
  });
}
document.addEventListener('click', unlockSoundOnce, { once: true, passive: true });
document.addEventListener('touchstart', unlockSoundOnce, { once: true, passive: true });

// create audio early
createAudio();

// socket events
socket.on('connect', () => console.log('✅ Socket connected'));
socket.on('disconnect', () => console.log('❌ Socket disconnected'));

// escape HTML to avoid injection into UI
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`=\/]/g, function (s) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;',
      '=': '&#61;',
      '/': '&#47;'
    })[s];
  });
}

// Adds an alert object to the recent-list (newest on top)
function addAlertToUI(alert) {
  const list = document.getElementById('recent-list');
  if (!list) return;

  const node = document.createElement('div');
  node.className = 'list-group-item alert-row d-flex justify-content-between align-items-start';

  const left = document.createElement('div');
  left.className = 'ms-2 me-auto';

  const title = document.createElement('div');
  title.className = 'fw-bold alert-title';
  title.textContent = escapeHtml(alert.title);

  const msg = document.createElement('div');
  msg.className = 'small text-muted alert-message';
  msg.textContent = escapeHtml(alert.message);

  left.appendChild(title);
  left.appendChild(msg);

  const time = document.createElement('span');
  time.className = 'badge rounded-pill alert-time';
  // Try to format; fall back to raw
  try {
    time.textContent = new Date(alert.timestamp).toLocaleString();
  } catch (e) {
    time.textContent = alert.timestamp ? alert.timestamp.slice(0,19).replace('T',' ') : '';
  }

  node.appendChild(left);
  node.appendChild(time);

  list.prepend(node);
}

// On receiving new_alert event
socket.on('new_alert', (alert) => {
  console.log('🚨 new_alert', alert);

  // Play sound if unlocked or try anyway
  if (alertSound) {
    try {
      alertSound.currentTime = 0;
      const p = alertSound.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  // Vibrate (mobile)
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 120, 200]); } catch (e) {}
  }

  // Add to UI
  addAlertToUI(alert);
});
