// =====================================================
// ✅ CCTV ALERT SYSTEM — FIREBASE CONFIG + FCM SETUP (Final)
// =====================================================

// 🔹 Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

// =====================================================
// 🔹 Firebase Configuration
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyCt3xBMytdZZOtpU9ZO3PVBzToS45xyfkw",
  authDomain: "cctv-alert-system.firebaseapp.com",
  projectId: "cctv-alert-system",
  storageBucket: "cctv-alert-system.firebasestorage.app",
  messagingSenderId: "558697124651",
  appId: "1:558697124651:web:d7ac970614061d0b12eb6e",
};

// =====================================================
// 🔹 Initialize Firebase + Messaging
// =====================================================
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// =====================================================
// 🔹 Register Service Worker for Background Notifications
// =====================================================
async function registerServiceWorker() {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("✅ Service Worker registered successfully:", registration);
      return registration;
    } else {
      console.warn("⚠️ Service Workers are not supported in this browser.");
      return null;
    }
  } catch (err) {
    console.error("❌ Service Worker registration failed:", err);
    return null;
  }
}

// =====================================================
// 🔹 Request Permission and Register Token
// =====================================================
async function requestPermissionAndRegister() {
  try {
    console.log("🔔 Requesting notification permission...");
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.warn("🚫 Notifications permission denied by user.");
      return;
    }

    console.log("✅ Notification permission granted.");

    // Register service worker first
    const swReg = await registerServiceWorker();

    // Retrieve token
    const token = await getToken(messaging, {
      vapidKey: "BN1tihFeOimRfY6Mcc4qWFGquqoXAUJTNSwKyN0uGhLzh3io7ogfpad9GsikAuY52kP8tP7srr1L36HafZ4EHYs",
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn("🚫 No registration token received. Try again later.");
      return;
    }

    console.log("✅ FCM Token:", token);

    // Verify user is logged in before saving token
    const authCheck = await fetch("/api/me", { credentials: "include" });
    const userData = await authCheck.json();

    if (!userData.ok) {
      console.warn("⚠️ User not logged in — skipping token save.");
      return;
    }

    console.log("👤 Logged in as:", userData.user.username);

    // Send token to backend
    const response = await fetch("/api/save-fcm-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      console.log("📡 Token sent to backend successfully!");
    } else {
      console.warn("⚠️ Failed to send token to server:", response.status);
    }
  } catch (err) {
    console.error("❌ Error during FCM registration:", err);
  }
}

// =====================================================
// 🔹 Listen for Foreground Notifications
// =====================================================
onMessage(messaging, (payload) => {
  console.log("📩 Message received (foreground):", payload);

  // Display custom notification when the page is open
  if (Notification.permission === "granted") {
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: "/static/icons/icon-192.png",
      vibrate: [200, 100, 200],
    });
  }
});

// =====================================================
// 🔹 Handle Token Refresh Automatically
// =====================================================
if (onTokenRefresh) {
  onTokenRefresh(messaging, async () => {
    console.log("♻️ FCM token refreshed, re-registering...");
    await requestPermissionAndRegister();
  });
}

// =====================================================
// 🔹 Start FCM Registration on Page Load
// =====================================================
document.addEventListener("DOMContentLoaded", requestPermissionAndRegister);
