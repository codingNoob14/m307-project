import slugify from '../helpers/slugify.js';
import { db } from './state.js';
import { makeUniqueContentSlug } from './slug.js';

// Inhalte einfuegen - Erzeugt automatisch einen EINDEUTIGEN slug aus dem Titel.
export function insertContent({ title, description, category, imagePath, ownerId }) {
  if (!db) return null;

  // 1) Basis-Slug aus dem Titel generieren
  const baseSlug = slugify(title);
  // 2) Eindeutigen Slug fuer die DB finden
  const slug = makeUniqueContentSlug(db, baseSlug);

  const stmt = db.prepare(`
    INSERT INTO contents (title, description, category, image_path, owner_id, slug, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const info = stmt.run(title, description, category, imagePath, ownerId, slug);
  return info.lastInsertRowid;
}

// Einzelnen Inhalt per Slug holen (fuer Detailseite /content/:slug)
export function getContentBySlug(slug) {
  if (!db) return null;
  const r = db
    .prepare(`
      SELECT
        c.id, c.title, c.description, c.category, c.image_path, c.slug,
        c.created_at, c.owner_id, u.name AS owner_name
      FROM contents c
      LEFT JOIN users u ON u.id = c.owner_id
      WHERE c.slug = ?
      LIMIT 1
    `)
    .get(slug);

  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    imagePath: r.image_path,
    slug: r.slug,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    createdAt: new Date(r.created_at),
  };
}

// Optional: Inhalt per ID holen (fuer Redirects, Admin, etc.)
export function getContentById(id) {
  if (!db) return null;
  const row = db
    .prepare(`
      SELECT
        c.id, c.title, c.description, c.category, c.image_path, c.slug, c.created_at,
        u.name AS owner_name
      FROM contents c
      LEFT JOIN users u ON u.id = c.owner_id
      WHERE c.id = ?
      LIMIT 1
    `)
    .get(id);
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    imagePath: row.image_path,
    slug: row.slug,
    ownerName: row.owner_name,
    createdAt: new Date(row.created_at),
  };
}

export function listContents() {
  if (!db) return [];
  const rows = db
    .prepare(`
      SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.image_path,
        c.slug,
        c.created_at,
        c.owner_id,
        u.name AS owner_name,
        -- Like-Anzahl via Subselect
        (SELECT COUNT(*)
           FROM likes l
          WHERE l.content_id = c.id) AS like_count
      FROM contents c
      LEFT JOIN users u ON u.id = c.owner_id
      ORDER BY c.created_at DESC
    `)
    .all();

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    imagePath: r.image_path,
    slug: r.slug,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    likeCount: r.like_count ?? 0,
    createdAt: new Date(r.created_at),
  }));
}

export function updateContent({ id, title, description, category, imagePath }) {
  if (!db) return 0;
  if (imagePath) {
    const stmt = db.prepare(`
      UPDATE contents
      SET title = ?, description = ?, category = ?, image_path = ?
      WHERE id = ?
    `);
    return stmt.run(title, description, category, imagePath, id).changes;
  }
  const stmt = db.prepare(`
    UPDATE contents
    SET title = ?, description = ?, category = ?
    WHERE id = ?
  `);
  return stmt.run(title, description, category, id).changes;
}

export function deleteContentById(id) {
  if (!db) return 0;
  const stmt = db.prepare(`DELETE FROM contents WHERE id = ?`);
  return stmt.run(id).changes;
}

// Inhalte filtern + sortieren
// - category: "" | "Flying" | "Automatic" | "Manual" | null
// - ownerId : number | null
// - sort    : "newest" | "likes"
export function listContentsFiltered({ category = null, ownerId = null, sort = 'newest' } = {}) {
  if (!db) return [];
  const where = [];
  const params = [];

  // Immer mind. 1 Bedingung, verhindert "WHERE ORDER BY"-Fehler
  where.push('1=1');

  if (category) {
    where.push('c.category = ?');
    params.push(category);
  }

  if (ownerId) {
    where.push('c.owner_id = ?');
    params.push(ownerId);
  }

  const orderBy =
    sort === 'likes'
      ? 'COALESCE(lc.likeCount, 0) DESC, c.created_at DESC, c.id DESC'
      : 'c.created_at DESC, c.id DESC';

  const rows = db
    .prepare(`
      SELECT
        c.id,
        c.title,
        c.description,
        c.category,
        c.image_path AS imagePath,
        c.slug,
        c.created_at,
        c.owner_id,
        u.name AS ownerName,
        COALESCE(lc.likeCount, 0) AS likeCount
      FROM contents c
      LEFT JOIN users u ON u.id = c.owner_id
      LEFT JOIN (
        SELECT content_id, COUNT(*) AS likeCount
        FROM likes
        GROUP BY content_id
      ) lc ON lc.content_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
    `)
    .all(...params);

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    imagePath: r.imagePath,
    slug: r.slug,
    ownerId: r.owner_id,
    ownerName: r.ownerName,
    likeCount: r.likeCount ?? 0,
    createdAt: new Date(r.created_at),
  }));
}
