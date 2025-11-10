// =========================================
// firebase-messaging-sw.js (Final)
// =========================================

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "cctv-alert-system.firebaseapp.com",
  projectId: "cctv-alert-system",
  messagingSenderId: "558697124651",
  appId: "1:558697124651:web:d7ac970614061d0b12eb6e"
});

const messaging = firebase.messaging();

// ✅ Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const { title, body } = payload.notification || {};
  const notificationTitle = title || "🔔 CCTV Alert";
  const notificationOptions = {
    body: body || "You have a new security alert.",
    icon: '/static/icons/icon-192.png',
    vibrate: [200, 100, 200]
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/user'));
});
