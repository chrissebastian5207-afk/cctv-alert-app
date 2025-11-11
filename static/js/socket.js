// =====================================================
// ✅ Socket.IO Client - Stable Configuration with Alert Handling
// =====================================================

console.log('🔌 Initializing Socket.IO connection...');

// Initialize Socket.IO with stable reconnection settings
const socket = io({
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  upgrade: true,                         // Allow upgrading transports
  reconnection: true,                    // Auto-reconnect on disconnect
  reconnectionAttempts: Infinity,        // Keep trying to reconnect
  reconnectionDelay: 1000,              // Wait 1s before first reconnect
  reconnectionDelayMax: 5000,           // Max 5s between reconnect attempts
  timeout: 20000,                        // Connection timeout
  autoConnect: true,                     // Connect immediately
  forceNew: false                        // Reuse existing connection
});

// Make socket available globally
window.socketIO = socket;
console.log('✅ Socket.IO initialized and available at window.socketIO');

// =====================================================
// 🔹 CONNECTION EVENT HANDLERS
// =====================================================

// Connection successful
socket.on('connect', () => {
  console.log('🔌 Socket.IO connected successfully');
  console.log('🆔 Socket ID:', socket.id);
  console.log('🔗 Transport:', socket.io.engine.transport.name);

  // Notify server that user is connected and ready for alerts
  socket.emit('userConnected');
});

// ✅ Server confirms connection
socket.on('connectionConfirmed', (data) => {
  console.log('✅ Server confirmed connection:', data);
});

// Disconnection handler
socket.on('disconnect', (reason) => {
  console.log('❌ Socket.IO disconnected. Reason:', reason);

  // If server disconnected us, manually reconnect
  if (reason === 'io server disconnect') {
    console.log('🔄 Server disconnected, attempting to reconnect...');
    socket.connect();
  }
  // Otherwise, socket will auto-reconnect
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error.message);
  console.log('🔄 Will retry connection...');
});

// Reconnection attempt
socket.io.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 Reconnection attempt #${attemptNumber}`);
});

// Successfully reconnected
socket.on('reconnect', (attemptNumber) => {
  console.log(`✅ Reconnected after ${attemptNumber} attempts`);
  // Re-register for alerts after reconnection
  socket.emit('userConnected');
});

// Reconnection error
socket.io.on('reconnect_error', (error) => {
  console.error('❌ Reconnection error:', error.message);
});

// Failed to reconnect
socket.on('reconnect_failed', () => {
  console.error('❌ Failed to reconnect to server after all attempts');
});

// =====================================================
// 🚨 ALERT HANDLERS - Real-time Alert Reception
// =====================================================

// ✅ Listen for NEW real-time alerts from admin
socket.on('newAlert', (alert) => {
  console.log('🚨 NEW ALERT RECEIVED:', alert);

  // Dispatch custom event for dashboard to handle
  window.dispatchEvent(new CustomEvent('alertReceived', {
    detail: alert
  }));

  // Show browser notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`🚨 ${alert.title || 'CCTV Alert'}`, {
      body: alert.message || 'New alert received',
      icon: '/static/icons/icon-192x192.png',
      badge: '/static/icons/icon-192x192.png',
      tag: 'cctv-alert-' + alert.id,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // Play alert sound if enabled (will be handled by dashboard)
  window.dispatchEvent(new CustomEvent('playAlertSound'));
});

// ✅ Receive alert history when connecting
socket.on('alertHistory', (alerts) => {
  console.log(`📜 Received ${alerts.length} historical alerts`);

  // Dispatch event for dashboard to display history
  window.dispatchEvent(new CustomEvent('alertHistoryReceived', {
    detail: alerts
  }));
});

// =====================================================
// 🔹 PING/PONG MONITORING (Optional)
// =====================================================

socket.on('ping', () => {
  console.log('📡 Ping received from server');
});

socket.on('pong', (latency) => {
  console.log(`📡 Pong - Latency: ${latency}ms`);
});

// =====================================================
// 🔹 ERROR HANDLERS
// =====================================================

socket.on('error', (error) => {
  console.error('⚠️ Socket error:', error);
});

// =====================================================
// 🔹 HELPER FUNCTIONS FOR DASHBOARD
// =====================================================

// Function to manually send alert (for admin dashboard)
window.sendAlert = function(alertData) {
  if (!socket.connected) {
    console.error('❌ Cannot send alert: Socket not connected');
    return false;
  }

  socket.emit('sendAlert', alertData);
  console.log('📤 Alert sent to server:', alertData);
  return true;
};

// Function to check connection status
window.isSocketConnected = function() {
  return socket.connected;
};

// Function to get socket ID
window.getSocketId = function() {
  return socket.id;
};

console.log('✅ Socket.IO event listeners registered and ready');
console.log('✅ Helper functions available: window.sendAlert(), window.isSocketConnected(), window.getSocketId()');