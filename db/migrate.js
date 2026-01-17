import slugify from '../helpers/slugify.js';
import { hasColumn } from './schema.js';
import { makeUniqueContentSlug } from './slug.js';

export function migrate(instance) {
  instance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user','editor')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  // Inhalte-Tabelle fuer das Upload-Feature (falls noch nicht vorhanden)
  instance.exec(`
    CREATE TABLE IF NOT EXISTS contents (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL CHECK(category IN ('Flying','Automatic','Manual')),
      image_path  TEXT NOT NULL,
      owner_id    INTEGER NOT NULL,
      slug        TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contents_category ON contents(category);
    CREATE INDEX IF NOT EXISTS idx_contents_owner ON contents(owner_id);
  `);

  instance.exec(`
    UPDATE users
    SET created_at = datetime('now')
    WHERE created_at IS NULL OR TRIM(created_at) = '';
  `);

  // Fuer das naechste Modul (Login) schon jetzt vorbereitet:
  if (!hasColumn(instance, 'users', 'email')) {
    instance.exec(`ALTER TABLE users ADD COLUMN email TEXT;`);
  }
  if (!hasColumn(instance, 'users', 'password_hash')) {
    instance.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
  }

  // --- Slug-Spalte fuer "sprechende URLs" ---
  if (!hasColumn(instance, 'contents', 'slug')) {
    // Neue Spalte hinzufuegen (anfangs NULL, gleich folgt Backfill)
    instance.exec(`ALTER TABLE contents ADD COLUMN slug TEXT;`);
    console.log('[db] + column contents.slug');
  }

  // Backfill: vorhandene Inhalte ohne slug erhalten einen generierten, eindeutigen Slug
  // Hinweis: SQLite unterstuetzt keine pro-Zeile-Funktion beim UPDATE,
  // deshalb holen wir die Zeilen im JS-Code und setzen Slugs nacheinander.
  const rowsNeedingSlug = instance
    .prepare(`
      SELECT id, title FROM contents WHERE slug IS NULL OR TRIM(slug) = ''
    `)
    .all();

  if (rowsNeedingSlug.length) {
    const update = instance.prepare(`UPDATE contents SET slug = ? WHERE id = ?`);
    const tx = instance.transaction(rows => {
      for (const r of rows) {
        const base = slugify(r.title || '');
        const unique = makeUniqueContentSlug(instance, base);
        update.run(unique, r.id);
      }
    });
    tx(rowsNeedingSlug);
    console.log(`[db] backfilled ${rowsNeedingSlug.length} content slugs`);
  }

  // Eindeutigkeit erzwingen (case-insensitiv waere moeglich; fuer Slugs reicht meist normal)
  instance.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contents_slug_unique ON contents(slug);
  `);

  // UNIQUE-Index auf E-Mail - case-insensitiv (robust fuer spaeter)
  instance.exec(`
    DROP INDEX IF EXISTS idx_users_email_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase
    ON users(email COLLATE NOCASE);
  `);

  // --- Likes: User kann Inhalte liken (oeffentlich sichtbare Anzahl) ---
  instance.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      user_id    INTEGER NOT NULL,
      content_id INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, content_id),
      FOREIGN KEY(user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY(content_id) REFERENCES contents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_likes_content ON likes(content_id);
    CREATE INDEX IF NOT EXISTS idx_likes_user    ON likes(user_id);
  `);

  // --- Favoriten: private Merkliste pro User ---
  instance.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    INTEGER NOT NULL,
      content_id INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, content_id),
      FOREIGN KEY(user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY(content_id) REFERENCES contents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_fav_content ON favorites(content_id);
    CREATE INDEX IF NOT EXISTS idx_fav_user    ON favorites(user_id);
  `);
}
