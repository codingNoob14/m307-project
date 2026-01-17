// db/index.js
import { ensureDatabase, closeDb } from './connection.js';
import { setDb } from './state.js';

export {
  insertContent,
  getContentBySlug,
  getContentById,
  listContents,
  updateContent,
  deleteContentById,
  listContentsFiltered,
} from './contents.js';
export { getLikeCount, hasUserLiked, toggleLike, getUserLikedIds } from './likes.js';
export { isFavorite, toggleFavorite, listFavoritesOfUser } from './favorites.js';
export { getAllUsers, insertUser, getUserByEmail, createUser, listAuthors } from './users.js';

// ---- Initialisieren
setDb(ensureDatabase());

// ---- Graceful Shutdown
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
