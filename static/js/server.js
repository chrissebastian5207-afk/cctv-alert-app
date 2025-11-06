/**
 * CCTV Alert App Server.js (templates version)
 * --------------------------------------------
 * Uses 'templates/' as static folder instead of 'public/'
 * Supports:
 *  - Register / Login / Logout
 *  - Admin auto assignment (first 2 users)
 *  - Change password / Delete account
 *  - SQLite database
 *  - JWT authentication
 */

import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new Database("./users.db");
const JWT_SECRET = "super_secure_jwt_key_here"; // change before production
const PORT = process.env.PORT || 3000;
const DEBUG_MODE = false; // set true if you want all new users to be admins for testing

// --- Middleware ---
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// --- Serve static files from templates/ ---
app.use(express.static(path.join(__dirname, "templates")));

// --- Create DB if not exists ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// --- Helper functions ---
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

// --- Auth Middleware ---
function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: "Invalid token" });
  req.user = data;
  next();
}

// =====================================================
// 🔹 REGISTER
// =====================================================
app.post("/api/register", (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    let role = count < 2 ? "admin" : "user";
    if (DEBUG_MODE) role = "admin";

    const salt = bcrypt.genSaltSync(12);
    const hash = bcrypt.hashSync(password, salt);

    db.prepare(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run(username, email, hash, role);

    res.json({ ok: true, role });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Username or email already taken" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================================================
// 🔹 LOGIN
// =====================================================
app.post("/api/login", (req, res) => {
  const { usernameOrEmail, password } = req.body || {};
  if (!usernameOrEmail || !password)
    return res.status(400).json({ error: "Missing credentials" });

  const user = db
    .prepare("SELECT * FROM users WHERE username = ? OR email = ?")
    .get(usernameOrEmail, usernameOrEmail);

  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({
    uid: user.id,
    username: user.username,
    role: user.role,
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 3600 * 1000,
  });

  res.json({ ok: true, role: user.role });
});

// =====================================================
// 🔹 CURRENT USER
// =====================================================
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// =====================================================
// 🔹 LOGOUT
// =====================================================
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// =====================================================
// 🔹 DELETE ACCOUNT
// =====================================================
app.delete("/api/delete-account", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.user.uid);
  res.clearCookie("token");
  res.json({ ok: true, msg: "Account deleted" });
});

// =====================================================
// 🔹 CHANGE PASSWORD
// =====================================================
app.post("/api/change-password", authMiddleware, (req, res) => {
  const { oldPass, newPass } = req.body || {};
  if (!oldPass || !newPass)
    return res.status(400).json({ error: "Missing fields" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.uid);
  if (!user) return res.status(404).json({ error: "User not found" });

  const match = bcrypt.compareSync(oldPass, user.password_hash);
  if (!match) return res.status(401).json({ error: "Incorrect current password" });

  const salt = bcrypt.genSaltSync(12);
  const newHash = bcrypt.hashSync(newPass, salt);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, req.user.uid);

  res.json({ ok: true, msg: "Password updated" });
});

// =====================================================
// 🔹 ADMIN: VIEW USERS
// =====================================================
app.get("/api/users", authMiddleware, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });

  const users = db
    .prepare("SELECT id, username, email, role, created_at FROM users")
    .all();

  res.json({ ok: true, users });
});

// =====================================================
// 🔹 DEFAULT ROUTE (use templates folder)
// =====================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "login.html"));
});

// =====================================================
// 🚀 START SERVER
// =====================================================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
