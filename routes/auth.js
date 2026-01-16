import express from "express";
import bcrypt from "bcrypt";
import { getUserByEmail, createUser } from "../db/index.js";

const router = express.Router();

// --- Register
router.get("/register", (req, res) => {
  res.render("register", { title: "Registrieren" });
});

router.post("/register", async (req, res) => {
  const { name, email, password, password_confirm } = req.body || {};
  const errors = [];
  if (!name?.trim()) errors.push("Name ist erforderlich.");
  if (!email?.trim()) errors.push("E-Mail ist erforderlich.");
  if (!password) errors.push("Passwort ist erforderlich.");
  if (password !== password_confirm) {
    errors.push("Passwörter stimmen nicht überein.");
  }
  if (password && password.length < 8) {
    errors.push("Passwort muss mind. 8 Zeichen lang sein.");
  }

  const existing = email ? getUserByEmail(email.trim().toLowerCase()) : null;
  if (existing) errors.push("Diese E-Mail ist bereits registriert.");

  if (errors.length) {
    return res.status(400).render("register", {
      title: "Registrieren",
      errors,
      values: { name, email }
    });
  }

  const passwordHash = await bcrypt.hash(password, 11);
  const id = createUser({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: "user"
  });

  // Auto-Login
  req.session.user = {
    id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: "user"
  };
  res.redirect("/users");
});

// --- Login
router.get("/login", (req, res) => {
  res.render("login", { title: "Login", next: req.query.next || "" });
});

router.post("/login", async (req, res) => {
  const { email, password, next: nextUrl } = req.body || {};
  const errors = [];
  if (!email?.trim() || !password) {
    errors.push("E-Mail und Passwort sind erforderlich.");
    return res.status(400).render("login", { title: "Login", errors, values: { email } });
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user || !user.password_hash) {
    errors.push("E-Mail oder Passwort ist falsch.");
    return res.status(401).render("login", { title: "Login", errors, values: { email } });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    errors.push("E-Mail oder Passwort ist falsch.");
    return res.status(401).render("login", { title: "Login", errors, values: { email } });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const redirectTo = nextUrl && /^\/[^\s]*$/.test(nextUrl) ? nextUrl : "/users";
  res.redirect(redirectTo);
});

// --- Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

export default router;
