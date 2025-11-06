/**
 * CCTV Monitor App Backend
 * Features:
 * - User registration (first 2 users = admin)
 * - Secure login
 * - Delete account
 * - JWT-based auth
 * - SQLite local DB
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

const JWT_SECRET = "super_secure_jwt_key_here"; // change in production
const PORT = process.env.PORT || 3000;

// === Middleware ===
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, "public")));

// === Database setup ===
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user', -- 'admin' or 'user'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// === Helpers ===
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

// === Routes ===

// Register new user
app.post("/api/register", (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    // determine role
    const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    const role = userCount < 2 ? "admin" : "user";

    const salt = bcrypt.genSaltSync(12);
    const ph = bcrypt.hashSync(password, salt);

    db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(username, email, ph, role);

    return res.json({ ok: true, role });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "Username or email already taken" });
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
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

// Middleware for protected routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: "Invalid token" });
  req.user = data;
  next();
}

// Get current user info
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Delete account
app.delete("/api/delete-account", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ?").run(req.user.uid);
  res.clearCookie("token");
  res.json({ ok: true, msg: "Account deleted" });
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// === Start server ===
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
