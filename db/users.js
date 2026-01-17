import { db } from './state.js';

// Fallback: wird genutzt, wenn better-sqlite3 nicht installiert ist
const fallbackUsers = [
  { id: 1, name: 'DB', role: 'admin', createdAt: new Date('2024-11-02') },
  { id: 2, name: 'Fallback', role: 'user', createdAt: new Date('2025-01-15') },
  { id: 3, name: 'Data', role: 'editor', createdAt: new Date('2025-07-01') },
];

// ---- Public API
export function getAllUsers() {
  if (!db) return fallbackUsers.map(u => ({ ...u, email: null }));
  const rows = db
    .prepare(`
      SELECT id, name, role, email, created_at
      FROM users
      ORDER BY id ASC
    `)
    .all();
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    email: r.email || null,
    createdAt: new Date(r.created_at),
  }));
}

export function insertUser(name, role = 'user') {
  if (!db) return null;
  const info = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)').run(name, role);
  return info.lastInsertRowid;
}

// Fuer das Login-Modul schon vorbereitet:
export function getUserByEmail(email) {
  if (!db) return null;
  return db
    .prepare(`
      SELECT id, name, role, email, password_hash, created_at
      FROM users WHERE email = ?
    `)
    .get(email);
}

export function createUser({ name, email, passwordHash, role = 'user' }) {
  if (!db) return null;

  const stmt = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const info = stmt.run(name, email, passwordHash, role);
  return info.lastInsertRowid;
}

// Autorenliste fuer das Filter-Dropdown
export function listAuthors() {
  if (!db) return [];
  return db
    .prepare(`
      SELECT id, name
      FROM users
      ORDER BY name COLLATE NOCASE
    `)
    .all();
}
