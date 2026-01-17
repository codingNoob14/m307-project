import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './migrate.js';
import { db, setDb } from './state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let Database = null;

try {
  ({ default: Database } = await import('better-sqlite3'));
} catch (e) {
  console.warn('[db] better-sqlite3 nicht installiert - verwende Fallback-Daten.');
}

function resolveDbPath() {
  const fromEnv = process.env.DB_FILE;
  if (fromEnv) return fromEnv;
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'app.db');
}

export function ensureDatabase() {
  if (!Database) return null;
  const dbPath = resolveDbPath();
  console.log('[db] using:', path.resolve(dbPath));

  const instance = new Database(dbPath, {}); // { verbose: console.log } zum Debuggen
  migrate(instance);

  instance.pragma('wal_checkpoint(FULL)');
  return instance;
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    setDb(null);
  }
}
