const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIG: admin credentials ---
const ADMIN_USER = process.env.ADMIN_USER || "admin";
// Runtime password (can be changed via "forgot password" flow)
let adminPassword = process.env.ADMIN_PASS || "password123";

// Reset code for "forgot password" flow
const RESET_CODE = process.env.ADMIN_RESET_CODE || "resetme123"; // change this!

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "change-this-secret-key", // use a stronger secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if you use HTTPS / reverse proxy with HTTPS
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

// --- DATABASE SETUP ---
const db = new sqlite3.Database("./subscribers.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      newsletter_opt_in INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// --- AUTH MIDDLEWARE ---
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.redirect("/login");
}

// --- ROUTES: AUTH ---
// Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Handle login form submission
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === adminPassword) {
    req.session.authenticated = true;
    return res.redirect("/admin");
  }

  return res
    .status(401)
    .send('Invalid username or password. <a href="/login">Try again</a>.');
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// --- FORGOT PASSWORD FLOW ---
// Show forgot password page
app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "forgot-password.html"));
});

// Handle password reset
app.post("/forgot-password", (req, res) => {
  const { username, resetCode, newPassword, confirmPassword } = req.body;

  if (username !== ADMIN_USER) {
    return res
      .status(400)
      .send('Invalid username. <a href="/forgot-password">Try again</a>.');
  }

  if (resetCode !== RESET_CODE) {
    return res
      .status(400)
      .send('Invalid reset code. <a href="/forgot-password">Try again</a>.');
  }

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .send(
        'New password must be at least 6 characters. <a href="/forgot-password">Try again</a>.'
      );
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .send('Passwords do not match. <a href="/forgot-password">Try again</a>.');
  }

  // Update in-memory password (works until server restarts)
  adminPassword = newPassword;

  return res.send(
    'Password updated successfully. <a href="/login">Go to login</a>.'
  );
});

// --- ROUTES: API & PAGES ---
// Handle form submission from landing page
app.post("/api/submit", (req, res) => {
  const { firstName, lastName, email, newsletter } = req.body;

  if (!firstName || !lastName || !email || !newsletter) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }

  const optIn = newsletter === "in" ? 1 : 0;

  const stmt = db.prepare(
    "INSERT INTO subscribers (first_name, last_name, email, newsletter_opt_in) VALUES (?, ?, ?, ?)"
  );

  stmt.run(firstName, lastName, email, optIn, function (err) {
    if (err) {
      console.error("DB error:", err.message);
      if (err.message.includes("UNIQUE constraint failed")) {
        return res
          .status(409)
          .json({ message: "This email has already been submitted." });
      }
      return res.status(500).json({ message: "Database error." });
    }

    return res.json({ message: "Thank you and good luck." });
  });

  stmt.finalize();
});

// Admin-only: list submissions
app.get("/api/submissions", requireAuth, (req, res) => {
  db.all(
    "SELECT id, first_name, last_name, email, newsletter_opt_in, created_at FROM subscribers ORDER BY created_at DESC",
    (err, rows) => {
      if (err) {
        console.error("DB error:", err.message);
        return res.status(500).json({ message: "Database error." });
      }
      res.json(rows);
    }
  );
});

// Admin page (protected)
app.get("/admin", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
