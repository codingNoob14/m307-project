import { db } from './state.js';

// ------- Favoriten -------

// Ist dieser Inhalt in der Merkliste des Users?
export function isFavorite({ userId, contentId }) {
  if (!db) return false;
  const row = db
    .prepare(`
      SELECT 1 FROM favorites
      WHERE user_id = ? AND content_id = ?
      LIMIT 1
    `)
    .get(userId, contentId);
  return !!row;
}

// Favorit toggeln (an/aus). Gibt neuen Status zurueck.
export function toggleFavorite({ userId, contentId }) {
  if (!db) return { favorite: false };

  const fav = isFavorite({ userId, contentId });
  if (fav) {
    db.prepare(`
      DELETE FROM favorites
      WHERE user_id = ? AND content_id = ?
    `).run(userId, contentId);
  } else {
    db.prepare(`
      INSERT INTO favorites (user_id, content_id)
      VALUES (?, ?)
    `).run(userId, contentId);
  }
  return { favorite: !fav };
}

// Liste aller Favoriten eines Users (fuer /me/favorites)
export function listFavoritesOfUser(userId) {
  if (!db) return [];
  const rows = db
    .prepare(`
      SELECT
        c.id, c.title, c.description, c.category, c.image_path, c.slug,
        c.created_at, u.name AS owner_name
      FROM favorites f
      JOIN contents c ON c.id = f.content_id
      LEFT JOIN users u ON u.id = c.owner_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `)
    .all(userId);

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    imagePath: r.image_path,
    slug: r.slug,
    ownerName: r.owner_name,
    createdAt: new Date(r.created_at),
  }));
}
