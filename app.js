import express from "express";
import { engine } from "express-handlebars";
import path from "node:path";
import { fileURLToPath } from "node:url";
import formatDate from "./helpers/formatDate.js";
import session from "express-session";
import bcrypt from "bcrypt";
import fs from "node:fs";
import crypto from "node:crypto";
import multer from "multer";
import { getAllUsers, getUserByEmail, createUser, insertContent, listContents, getContentBySlug, getContentById, updateContent, deleteContentById } from "./db/index.js";
import { 

  // … 

  listContentsFiltered, 

  listAuthors, 

} from "./db/index.js"; 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 } // 8h
}));

// currentUser für Header/Views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

//Route-Schutz
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl || "/"));
  }
  next();
}
// Seite /user nur wenn eingeloggt anzeigen
app.get("/users", requireAuth, (req, res) => {
  try {
    const users = getAllUsers();
    res.render("users", { title: "Benutzer", users });
  } catch (err) {
    console.error("[/users] Fehler:", err);
    res.status(500).render("about", { title: "Fehler beim Laden der Benutzer" });
  }
});



const PORT = process.env.PORT || 3000;

// Static files (z. B. CSS)
app.use(express.static(path.join(__dirname, "public")));

// Body-Parser für Formulare (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));

// Upload-Ordner sicherstellen und Multer konfigurieren
const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const safeExt = allowed.includes(ext) ? ext : ".bin";
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
    cb(null, name);
  }
});

function fileFilter(req, file, cb) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype);
  cb(ok ? null : new Error("Nur Bilddateien (jpg, png, webp, gif) erlaubt."), ok);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Kategorien
const CATEGORIES = ["Flying", "Automatic", "Manual"];

/* ----------------------------- Handlebars ----------------------------- */ 

app.engine( 

  "hbs", 

  engine({ 

    extname: ".hbs", 

    defaultLayout: "main", 

    layoutsDir: path.join(__dirname, "views", "layouts"), 

    partialsDir: path.join(__dirname, "views", "partials"), 

    helpers: { 

      /* Text & Format */ 

      upper: (s) => String(s ?? "").toUpperCase(), 

      lower: (s) => String(s ?? "").toLowerCase(), 

      formatDate, 

      encodeURIComponent: (v) => encodeURIComponent(String(v ?? "")), 

 

      /* Vergleiche/Logik */ 

      eq:  (a, b) => a === b, 

      ne:  (a, b) => a !== b, 

      gt:  (a, b) => Number(a) >  Number(b), 

      gte: (a, b) => Number(a) >= Number(b), 

      lt:  (a, b) => Number(a) <  Number(b), 

      lte: (a, b) => Number(a) <= Number(b), 

      and: (...xs) => xs.slice(0, -1).every(Boolean), 

      or:  (...xs) => xs.slice(0, -1).some(Boolean), 

      not: (v) => !v, 

 

      /* Zahlen/Kleinkram */ 

      add:        (a, b) => Number(a) + Number(b), 

      subtract:   (a, b) => Number(a) - Number(b), 

      increment:  (n) => Number(n) + 1, 

      decrement:  (n) => Number(n) - 1, 

      length:     (v) => 

        Array.isArray(v) || typeof v === "string" ? v.length : 0, 

 

      /* Berechtigung */ 

      canEdit(item, currentUser) { 

        if (!currentUser || !item) return false; 

        return currentUser.role === 'admin' || item.ownerId === currentUser.id; 

      }, 

    }, 

  }) 

); 

app.set("view engine", "hbs"); 

app.set("views", path.join(__dirname, "views")); 


// Öffentliche Detailseite: /content/:slug 

app.get("/content/:slug", (req, res, next) => { 
app.engine
  const { slug } = req.params || {};
  const item = getContentBySlug(slug);
  if (!item) return next();
  const full = getContentById(item.id) || item; // ownerId sicherstellen
  res.render("detail", { title: full.title, item: full });

}); 

// Formular (nur eingeloggte User)
app.get("/content/new", requireAuth, (req, res) => {
  res.render("content_new", { title: "Neuer Inhalt", categories: CATEGORIES });
});

// Besitzer/Administrator prüfen
function requireOwnerOrAdmin(req, res, next) {
  const { item } = res.locals;
  const user = req.session.user;
  if (!user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  if (user.role === 'admin' || (item && item.ownerId === user.id)) return next();
  return res.status(403).render("about", { title: "403 – Kein Zugriff" });
}

// Formular absenden: Validieren, Datei speichern, DB schreiben
app.post("/content", requireAuth, upload.single("image"), (req, res) => {
  const { title, description, category } = req.body || {};
  const errors = [];

  if (!title?.trim()) errors.push("Titel ist erforderlich.");
  if (!description?.trim()) errors.push("Beschrieb ist erforderlich.");
  if (!CATEGORIES.includes(category)) errors.push("Ungültige Kategorie.");
  if (!req.file) errors.push("Bild ist erforderlich.");

  if (errors.length) {
    if (req.file) {
      try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch { /* ignore */ }
    }
    return res.status(400).render("content_new", {
      title: "Neuer Inhalt",
      categories: CATEGORIES,
      errors,
      values: { title, description, category }
    });
  }

  const webPath = "/uploads/" + req.file.filename;
  const ownerId = req.session.user.id;

  insertContent({
    title: title.trim(),
    description: description.trim(),
    category,
    imagePath: webPath,
    ownerId
  });

  res.redirect("/content");
});

// Edit Form anzeigen
app.get("/content/:slug/edit", requireAuth, (req, res, next) => {
  const item = getContentBySlug(req.params.slug);
  if (!item) return next();
  res.locals.item = getContentById(item.id); // für requireOwnerOrAdmin
  return requireOwnerOrAdmin(req, res, () => {
    res.render("content_edit", {
      title: `Bearbeiten: ${item.title}`,
      item: res.locals.item,
      categories: CATEGORIES
    });
  });
});

// Update verarbeiten (mit optional neuem Bild)
app.post("/content/:slug/edit", requireAuth, upload.single("image"), (req, res, next) => {
  const existing = getContentBySlug(req.params.slug);
  if (!existing) return next();
  res.locals.item = getContentById(existing.id);

  requireOwnerOrAdmin(req, res, async () => {
    const { title, description, category } = req.body || {};
    const errors = [];
    if (!title?.trim()) errors.push("Titel ist erforderlich.");
    if (!description?.trim()) errors.push("Beschrieb ist erforderlich.");
    if (!CATEGORIES.includes(category)) errors.push("Ungültige Kategorie.");

    let newImagePath = null;
    if (req.file) newImagePath = "/uploads/" + req.file.filename;

    if (errors.length) {
      if (req.file) { try { fs.unlinkSync(path.join(uploadDir, req.file.filename)); } catch {} }
      return res.status(400).render("content_edit", {
        title: `Bearbeiten: ${existing.title}`,
        item: { ...res.locals.item, title, description, category },
        categories: CATEGORIES,
        errors
      });
    }

    // Altes Bild löschen, wenn ersetzt (führenden Slash strippen!)
    if (newImagePath) {
      try {
        const rel = (res.locals.item?.imagePath || "").replace(/^\//, "");
        const oldAbs = path.join(__dirname, "public", rel);
        if (rel && fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
      } catch {}
    }

    updateContent({
      id: res.locals.item.id,
      title: title.trim(),
      description: description.trim(),
      category,
      imagePath: newImagePath || undefined
    });

    res.redirect(`/content/${existing.slug}`);
  });
});

// Delete (POST)
app.post("/content/:slug/delete", requireAuth, (req, res, next) => {
  const item = getContentBySlug(req.params.slug);
  if (!item) return next();
  res.locals.item = getContentById(item.id);

  requireOwnerOrAdmin(req, res, () => {
    try {
      const rel = (res.locals.item?.imagePath || "").replace(/^\//, "");
      const abs = path.join(__dirname, "public", rel);
      if (rel && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {}

    deleteContentById(res.locals.item.id);
    res.redirect("/content");
  });
});

// Öffentliche Liste (Filtern & Sortieren)
app.get("/content", (req, res) => {

  const { category = "", author = "", sort = "newest" } = req.query || {};

  const CATEGORIES = ["Flying", "Automatic", "Manual"];

  // Kategorie validieren
  const validCategory = CATEGORIES.includes(category) ? category : "";

  // Autor-ID validieren
  const authorId = Number(author);
  const validAuthorId = Number.isInteger(authorId) && authorId > 0 ? authorId : null;

  // Sort validieren
  const validSort = (sort === "likes") ? "likes" : "newest";

  // Daten laden
  const items = listContentsFiltered({
    category: validCategory || null,
    ownerId: validAuthorId || null,
    sort: validSort,
  });

  const authors = listAuthors();

  res.render("content_list", {
    title: "Filme",
    items,
    categories: CATEGORIES,
    authors,                         // [{ id, name }]
    selectedCategory: validCategory, // UI-State
    selectedAuthorId: validAuthorId, // UI-State
    selectedSort: validSort,         // UI-State
    currentUser: req.session.user || null,
    hasFilterActive: !!(validCategory || validAuthorId || validSort === "likes"),
  });

});



// Routen
app.get("/", (req, res) => {
  res.render("home", {
    title: "Startseite",
    name: "Handlebars",
    today: new Date(),
  });
});

app.get("/about", (req, res) => {
  res.render("about", { 
    title: "Über dieses Projekt" 
  });
});

app.get("/users", (req, res) => {
  try {
    const users = getAllUsers();
    res.render("users", { title: "Benutzer", users });
  } catch (err) {
    console.error("[/users] Fehler:", err);
    res.status(500).render("about", { title: "Fehler beim Laden der Benutzer" });
  }
});

// --- Register
app.get("/register", (req, res) => {
  res.render("register", { title: "Registrieren" });
});

app.post("/register", async (req, res) => {
  const { name, email, password, password_confirm } = req.body || {};
  const errors = [];
  if (!name?.trim()) errors.push("Name ist erforderlich.");
  if (!email?.trim()) errors.push("E-Mail ist erforderlich.");
  if (!password) errors.push("Passwort ist erforderlich.");
  if (password !== password_confirm) errors.push("Passwörter stimmen nicht überein.");
  if (password && password.length < 8) errors.push("Passwort muss mind. 8 Zeichen lang sein.");

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
  req.session.user = { id, name: name.trim(), email: email.trim().toLowerCase(), role: "user" };
  res.redirect("/users");
});

// --- Login
app.get("/login", (req, res) => {
  res.render("login", { title: "Login", next: req.query.next || "" });
});

app.post("/login", async (req, res) => {
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

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  const redirectTo = nextUrl && /^\/[^\s]*$/.test(nextUrl) ? nextUrl : "/users";
  res.redirect(redirectTo);
});

// --- Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});
 


// 404
app.use((req, res) => {
  res.status(404).render("about", { 
    title: "404 – Nicht gefunden" 
  });
});

app.listen(PORT, () => {
  console.log(`Server läuft: http://localhost:${PORT}`);
});

