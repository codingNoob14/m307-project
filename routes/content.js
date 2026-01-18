import express from "express";
import path from "node:path";
import fs from "node:fs";
import {
  insertContent,
  getContentBySlug,
  getContentById,
  updateContent,
  deleteContentById,
  listContentsFiltered,
  listAuthors,
  getLikeCount,
  hasUserLiked,
  toggleLike
} from "../db/index.js";
import { requireAdmin, requireAuth, requireOwnerOrAdmin } from "../middleware/auth.js";
import { upload, uploadDir } from "../middleware/upload.js";
import { CATEGORIES } from "../config/content.js";
import { rootDir } from "../config/paths.js";

const router = express.Router();

function requireAuthOrJson(req, res, next) {
  if (req.session.user) return next();
  const redirect = "/login?next=" + encodeURIComponent(req.originalUrl || "/");
  if (req.accepts("json")) return res.status(401).json({ redirect });
  return res.redirect(redirect);
}

// Öffentliche Detailseite: /content/:slug
router.get("/content/:slug", (req, res, next) => {
  const { slug } = req.params || {};
  const item = getContentBySlug(slug);
  if (!item) return next();
  const full = getContentById(item.id) || item; // ownerId sicherstellen

  // Like-Daten für den aktuellen User laden
  const userId = req.session.user?.id;
  const likeCount = getLikeCount(full.id);
  const userHasLiked = userId ? hasUserLiked({ userId, contentId: full.id }) : false;

  res.render("detail", {
    title: full.title,
    item: { ...full, likeCount, userHasLiked }
  });
});

// Form (only admin)
router.get("/content/new", requireAdmin, (req, res) => {
  res.render("content_new", { title: "Neuer Inhalt", categories: CATEGORIES });
});

// Formular absenden: Validieren, Datei speichern, DB schreiben only admin
router.post("/content", requireAdmin, upload.single("image"), (req, res) => {
  const { title, description, category } = req.body || {};
  const errors = [];

  if (!title?.trim()) errors.push("Titel ist erforderlich.");
  if (!description?.trim()) errors.push("Beschrieb ist erforderlich.");
  if (!CATEGORIES.includes(category)) errors.push("Ungültige Kategorie.");
  if (!req.file) errors.push("Bild ist erforderlich.");

  if (errors.length) {
    if (req.file) {
      try {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
      } catch {
        /* ignore */
      }
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
router.get("/content/:slug/edit", requireAuth, requireAdmin, (req, res, next) => {
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
router.post(
  "/content/:slug/edit",
  requireAdmin,
  upload.single("image"),
  (req, res, next) => {
    const existing = getContentBySlug(req.params.slug);
    if (!existing) return next();
    res.locals.item = getContentById(existing.id);

    requireAdmin(req, res, async () => {
      const { title, description, category } = req.body || {};
      const errors = [];
      if (!title?.trim()) errors.push("Titel ist erforderlich.");
      if (!description?.trim()) errors.push("Beschrieb ist erforderlich.");
      if (!CATEGORIES.includes(category)) errors.push("Ungültige Kategorie.");

      let newImagePath = null;
      if (req.file) newImagePath = "/uploads/" + req.file.filename;

      if (errors.length) {
        if (req.file) {
          try {
            fs.unlinkSync(path.join(uploadDir, req.file.filename));
          } catch {}
        }
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
          const oldAbs = path.join(rootDir, "public", rel);
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
  }
);

// Delete (POST)
router.post("/content/:slug/delete", requireAuth, (req, res, next) => {
  const item = getContentBySlug(req.params.slug);
  if (!item) return next();
  res.locals.item = getContentById(item.id);

  requireOwnerOrAdmin(req, res, () => {
    try {
      const rel = (res.locals.item?.imagePath || "").replace(/^\//, "");
      const abs = path.join(rootDir, "public", rel);
      if (rel && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {}

    deleteContentById(res.locals.item.id);
    res.redirect("/content");
  });
});

// Öffentliche Liste (Filtern & Sortieren)
router.get("/content", (req, res) => {
  const { category = "", author = "", sort = "newest" } = req.query || {};

  // Kategorie validieren
  const validCategory = CATEGORIES.includes(category) ? category : "";

  // Autor-ID validieren
  const authorId = Number(author);
  const validAuthorId = Number.isInteger(authorId) && authorId > 0 ? authorId : null;

  // Sort validieren
  const validSort = sort === "likes" ? "likes" : "newest";

  // Daten laden
  const baseItems = listContentsFiltered({
    category: validCategory || null,
    ownerId: validAuthorId || null,
    sort: validSort
  });

  // Like-Status für den aktuellen User hinzufügen
  const userId = req.session.user?.id;
  const items = baseItems.map(item => ({
    ...item,
    userHasLiked: userId ? hasUserLiked({ userId, contentId: item.id }) : false
  }));

  const authors = listAuthors();

  res.render("content_list", {
    title: "Filme",
    items,
    categories: CATEGORIES,
    authors, // [{ id, name }]
    selectedCategory: validCategory, // UI-State
    selectedAuthorId: validAuthorId, // UI-State
    selectedSort: validSort, // UI-State
    currentUser: req.session.user || null,
    hasFilterActive: !!(validCategory || validAuthorId || validSort === "likes")
  });
});

// Like toggle - GET route mit Redirect (Server-Side)
function toggleLikeHandler(req, res) {
  const item = getContentBySlug(req.params.slug);
  if (!item) {
    if (req.accepts("json")) return res.status(404).json({ error: "Not found" });
    return res.status(404).redirect("/content");
  }

  const userId = req.session.user.id;
  const contentId = item.id;

  try {
    const result = toggleLike({ userId, contentId });
    // Redirect zurück zur ursprünglichen Seite
    if (req.accepts("json")) {
      return res.json({ liked: result.liked, count: result.count });
    }
    const referer = req.get("Referer");
    if (referer && referer.includes("/content/")) return res.redirect(referer);
    return res.redirect(`/content/${req.params.slug}`);
  } catch (error) {
    console.error("[Like Toggle Error]:", error);
    if (req.accepts("json")) return res.status(500).json({ error: "Like toggle failed" });
    return res.redirect(`/content/${req.params.slug}`);
  }
}

router.post("/content/:slug/like", requireAuthOrJson, toggleLikeHandler);
router.get("/content/:slug/like", requireAuth, toggleLikeHandler);

export default router;
