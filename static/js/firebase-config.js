// Import Firebase scripts
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCt3xBMytdZZOtpU9ZO3PVBzToS45xyfkw",
  authDomain: "cctv-alert-system.firebaseapp.com",
  projectId: "cctv-alert-system",
  storageBucket: "cctv-alert-system.firebasestorage.app",
  messagingSenderId: "558697124651",
  appId: "1:558697124651:web:d7ac970614061d0b12eb6e",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ✅ Request permission and register FCM token
async function requestPermissionAndRegister() {
  try {
    console.log("🔔 Requesting notification permission...");
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("✅ Notification permission granted.");

      const token = await getToken(messaging, {
        vapidKey: "BN1tihFeOimRfY6Mcc4qWFGquqoXAUJTNSwKyN0uGhLzh3io7ogfpad9GsikAuY52kP8tP7srr1L36HafZ4EHYs",
      });

      if (token) {
        console.log("✅ FCM Token:", token);

        // Send token to your backend server
        const response = await fetch("/api/save-fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          console.log("📱 Token sent to server successfully!");
        } else {
          console.warn("⚠️ Failed to send token to server:", response.status);
        }
      } else {
        console.warn("🚫 No registration token available. Request permission again.");
      }
    } else {
      console.warn("🚫 Notifications permission denied by user.");
    }
  } catch (err) {
    console.error("❌ Error while getting FCM token:", err);
  }
}

// ✅ Register on page load
requestPermissionAndRegister();

// ✅ Listen for foreground notifications
onMessage(messaging, (payload) => {
  console.log("📩 Message received:", payload);
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/static/icons/icon-192.png",
  });
});
