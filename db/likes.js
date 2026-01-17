import { db } from './state.js';

// ------- Likes -------

// Anzahl Likes fuer einen Inhalt
export function getLikeCount(contentId) {
  if (!db) return 0;
  const row = db.prepare(`SELECT COUNT(*) AS c FROM likes WHERE content_id = ?`).get(contentId);
  return row?.c ?? 0;
}

// Hat ein bestimmter User den Inhalt geliked?
export function hasUserLiked({ userId, contentId }) {
  if (!db) return false;
  const row = db
    .prepare(`
      SELECT 1 FROM likes
      WHERE user_id = ? AND content_id = ?
      LIMIT 1
    `)
    .get(userId, contentId);
  return !!row;
}

// Like toggeln (an/aus). Gibt neuen Status + Count zurueck.
export function toggleLike({ userId, contentId }) {
  if (!db) return { liked: false, count: 0 };

  const liked = hasUserLiked({ userId, contentId });
  if (liked) {
    db.prepare(`
      DELETE FROM likes
      WHERE user_id = ? AND content_id = ?
    `).run(userId, contentId);
  } else {
    db.prepare(`
      INSERT INTO likes (user_id, content_id)
      VALUES (?, ?)
    `).run(userId, contentId);
  }
  return { liked: !liked, count: getLikeCount(contentId) };
}

// optional, falls du spaeter im Grid markierte Likes brauchst
export function getUserLikedIds(userId) {
  if (!db) return new Set();
  const rows = db.prepare(`SELECT content_id FROM likes WHERE user_id = ?`).all(userId);
  return new Set(rows.map(r => r.content_id));
}
