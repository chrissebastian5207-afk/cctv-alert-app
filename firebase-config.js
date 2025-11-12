// =========================================
// ✅ Firebase Config (Final, v10+ Compatible)
// =========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// ✅ Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "cctv-alert-system.firebaseapp.com",
  projectId: "cctv-alert-system",
  messagingSenderId: "558697124651",
  appId: "1:558697124651:web:d7ac970614061d0b12eb6e"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

console.log("✅ Firebase initialized");

// ✅ Request notification permission & register service worker
async function requestPermissionAndRegister() {
  console.log("🔔 Requesting notification permission...");
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("⚠️ Notification permission denied.");
      return;
    }

    console.log("✅ Notification permission granted.");

    // ✅ Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("✅ Service Worker registered:", registration);

    // ✅ Get FCM Token
    const token = await getToken(messaging, {
      vapidKey: "YOUR_PUBLIC_VAPID_KEY",
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("✅ FCM Token:", token);

      // Save token to server
      await fetch("/api/save-fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });
      console.log("📡 Token sent to server successfully.");
    } else {
      console.warn("⚠️ No FCM token retrieved.");
    }
  } catch (err) {
    console.error("❌ Error while getting FCM token:", err);
  }
}

// ✅ Handle foreground messages
onMessage(messaging, (payload) => {
  console.log("📩 Foreground message received:", payload);
  const { title, body } = payload.notification || {};
  if (Notification.permission === "granted") {
    new Notification(title || "🔔 CCTV Alert", {
      body: body || "You have a new security alert.",
      icon: "/static/icons/icon-192.png"
    });
  }
});

// ✅ Run automatically
requestPermissionAndRegister();
