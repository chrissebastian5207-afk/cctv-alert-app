// =====================================================
// ✅ CCTV ALERT SYSTEM — FULL SERVER CODE (FINAL FIXED VERSION)
// =====================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import admin from "firebase-admin"; // Firebase Admin SDK

// =====================================================
// 🔹 PATH SETUP
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🧭 Current directory:", __dirname);

// =====================================================
// 🔹 SERVER + SOCKET.IO SETUP
// =====================================================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: false,
  httpCompression: false
});

// =====================================================
// 🔹 CONFIG
// =====================================================
const db = new Database(path.join(__dirname, "users.db"));
const JWT_SECRET = "super_secure_jwt_key_change_in_production";
const PORT = process.env.PORT || 3000;
const DEBUG_MODE = false;

// =====================================================
// 🔹 DATA DIRECTORIES
// =====================================================
const DATA_DIR = path.join(__dirname, "data");
const ALERT_FILE = path.join(DATA_DIR, "alerts.json");
const FCM_TOKEN_FILE = path.join(DATA_DIR, "fcm_tokens.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ALERT_FILE)) fs.writeFileSync(ALERT_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(FCM_TOKEN_FILE)) fs.writeFileSync(FCM_TOKEN_FILE, JSON.stringify({}, null, 2));

// =====================================================
// 🔹 HELPER FUNCTIONS
// =====================================================
function loadAlerts() {
  try {
    return JSON.parse(fs.readFileSync(ALERT_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveAlerts(alerts) {
  fs.writeFileSync(ALERT_FILE, JSON.stringify(alerts, null, 2));
}

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(FCM_TOKEN_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveTokens(tokens) {
  fs.writeFileSync(FCM_TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

// =====================================================
// 🔹 MIDDLEWARE
// =====================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use("/static", express.static(path.join(__dirname, "static"))); // ✅ Serve all static assets

// =====================================================
// 🔹 STATIC FILES & SERVICE WORKERS
// =====================================================
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "manifest.json"));
});

// ✅ Serve Firebase Messaging Service Worker from root
app.get("/firebase-messaging-sw.js", (req, res) => {
  res.sendFile(path.join(__dirname, "firebase-messaging-sw.js"));
});

// ✅ Serve Firebase Config (FIXED — from root, not static/js)
app.get("/firebase-config.js", (req, res) => {
  res.sendFile(path.join(__dirname, "firebase-config.js"));
});

// =====================================================
// 🔹 DATABASE INIT
// =====================================================
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// =====================================================
// 🔹 JWT HELPERS
// =====================================================
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: "Invalid token" });
  req.user = data;
  next();
}

// =====================================================
// 🔹 FIREBASE ADMIN INITIALIZATION
// =====================================================
try {
  const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✅ Firebase Admin initialized");
  } else {
    console.warn("⚠️ serviceAccountKey.json not found — Push notifications disabled.");
  }
} catch (err) {
  console.error("❌ Firebase initialization error:", err);
}

// =====================================================
// 🔹 SAVE FCM TOKEN API
// =====================================================
app.post("/api/save-fcm-token", authMiddleware, (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "Missing token" });

  const tokens = loadTokens();
  tokens[req.user.username] = token;
  saveTokens(tokens);
  console.log(`📱 Saved FCM token for user: ${req.user.username}`);
  res.json({ ok: true });
});

// =====================================================
// 🔹 PUSH NOTIFICATION SENDER
// =====================================================
async function sendPushNotification(title, message, priority = "medium") {
  try {
    if (!admin.apps.length) return console.warn("⚠️ Firebase not initialized, skipping push send.");
    const tokens = Object.values(loadTokens());
    if (!tokens.length) return console.log("📭 No FCM tokens registered.");

    const payload = {
      notification: { title: `🚨 ${title}`, body: message },
      data: { priority },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...payload,
    });

    console.log(`📤 Push sent to ${response.successCount}/${tokens.length} devices`);
  } catch (err) {
    console.error("❌ Push notification error:", err);
  }
}

// =====================================================
// 🔹 AUTH ROUTES
// =====================================================
app.post("/api/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "All fields required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    let role = count < 2 ? "admin" : "user";
    if (DEBUG_MODE) role = "admin";

    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(username, hash, role);

    res.json({ ok: true, role });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "Username already taken" });
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({
    uid: user.id,
    username: user.username,
    role: user.role,
    registeredAt: user.created_at,
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600 * 1000,
  });

  res.json({ ok: true, role: user.role });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ✅ Change Password
app.post("/api/change-password", authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "All fields required" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "New password must be at least 6 characters" });

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(req.user.username);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash))
    return res.status(401).json({ error: "Current password incorrect" });

  const newHash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(12));
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);
  console.log(`🔑 Password updated for ${user.username}`);
  res.json({ ok: true, message: "Password updated successfully" });
});

// ✅ Delete Account
app.delete("/api/delete-account", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM users WHERE username = ?").run(req.user.username);
  res.clearCookie("token");
  console.log(`🗑️ Deleted account: ${req.user.username}`);
  res.json({ ok: true, message: "Account deleted" });
});

// =====================================================
// 🔹 ALERTS
// =====================================================
app.post("/api/send_alert", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ status: "error", message: "Unauthorized" });

  const { title, message, priority } = req.body || {};
  const alerts = loadAlerts();
  const newAlert = {
    id: alerts.length + 1,
    title: title || "Alert",
    message: message || "",
    priority: (priority || "medium").toLowerCase(),
    timestamp: new Date().toISOString(),
  };

  alerts.push(newAlert);
  saveAlerts(alerts);

  io.emit("newAlert", newAlert);
  console.log(`📢 Alert broadcasted to all clients:`, newAlert);

  await sendPushNotification(newAlert.title, newAlert.message, newAlert.priority);
  res.json({ status: "ok", alert: newAlert });
});

app.get("/api/alerts", authMiddleware, (req, res) => {
  const alerts = loadAlerts();
  res.json({ ok: true, alerts: alerts.reverse() });
});

// =====================================================
// 🔹 HTML TEMPLATE ROUTES
// =====================================================
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "templates", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "templates", "register.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "templates", "admin_dashboard.html")));
app.get("/user", (req, res) => res.sendFile(path.join(__dirname, "templates", "user_dashboard.html")));
app.get("/settings", (req, res) => res.sendFile(path.join(__dirname, "templates", "settings.html")));
app.get("/privacy", (req, res) => res.sendFile(path.join(__dirname, "templates", "privacy.html")));
app.get("/contact", (req, res) => res.sendFile(path.join(__dirname, "templates", "contact.html")));

// =====================================================
// 🔹 SOCKET.IO CONNECTION HANDLER
// =====================================================
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.emit('connectionConfirmed', {
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on("userConnected", () => {
    try {
      const alerts = loadAlerts();
      socket.emit("alertHistory", alerts.reverse());
      console.log(`📜 Sent ${alerts.length} alerts to client ${socket.id}`);
    } catch (err) {
      console.error("❌ Error loading alerts:", err);
      socket.emit("alertHistory", []);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, Reason: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error(`⚠️ Socket error for ${socket.id}:`, error);
  });
});

// =====================================================
// 🪵 Global 404 logger
// =====================================================
app.use((req, res, next) => {
  console.warn(`⚠️ 404 - Not Found: ${req.originalUrl}`);
  res.status(404).send("Not Found");
});

// =====================================================
// 🚀 START SERVER
// =====================================================
httpServer.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 CCTV Alert System Started!");
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Socket.IO enabled with stability settings`);
  console.log("=".repeat(50));
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ ERROR: Port ${PORT} is already in use!`);
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});
