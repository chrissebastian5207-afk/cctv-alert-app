// Socket.IO Client Initialization
console.log('🔌 Initializing Socket.IO connection...');

const socket = io({
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  reconnectionDelayMax: 5000
});

// Make socket available globally
window.socketIO = socket;

console.log('✅ Socket.IO initialized and available at window.socketIO');

// Connection event handlers
socket.on('connect', () => {
  console.log('🔌 Socket.IO connected successfully');
  console.log('🆔 Socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket.IO disconnected. Reason:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection error:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('🔄 Attempting to reconnect... Attempt:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('❌ Reconnection error:', error.message);
});

socket.on('reconnect_failed', () => {
  console.error('❌ Failed to reconnect to server');
});