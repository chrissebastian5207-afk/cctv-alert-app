// =========================================
// firebase-config.js
// =========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// --- Your Firebase configuration ---
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "cctv-alert-system.firebaseapp.com",
  projectId: "cctv-alert-system",
  storageBucket: "cctv-alert-system.appspot.com",
  messagingSenderId: "558697124651",
  appId: "1:558697124651:web:d7ac970614061d0b12eb6e"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Messaging
export const messaging = getMessaging(app);
