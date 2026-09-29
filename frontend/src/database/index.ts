export type { ReaderDBSchema, StreakData } from "./schema";
export type { Book, Bookmark, Highlight, UserProfile } from "./schema";

export { DB_NAME, DB_VERSION } from "./schema";

export {
  setCurrentUserId,
  getCurrentUserId,
  getDbInstance,
  getDatabase,
  clearDatabase,
  resetDatabase,
} from "./connection";

export {
  getAllBooks,
  getBook,
  saveBook,
  deleteBook,
  updateBookReadingTime,
  setBookReadingTime,
  updateBookScrollPosition,
  updateBookCurrentPage,
  setBookOrder,
  updateBookPosition,
} from "./features/books";

export {
  getBookmarksByBook,
  getBookmark,
  saveBookmark,
  updateBookmark,
  deleteBookmark,
} from "./features/bookmarks";

export {
  getHighlightsByBook,
  saveHighlight,
  deleteHighlight,
} from "./features/highlights";

export {
  getUserProfile,
  getOrCreateUserProfile,
  updateUserReadingTime,
  getTotalReadingTime,
} from "./features/user";

export {
  getStreakData,
  saveStreakData,
  syncStreakFromCloud,
  completeDayInCloud,
} from "./features/streaks";

export { syncBooksFromCloud } from "./sync";
export {
  syncBookmarksFromCloud,
  mergeBookmarks,
  pickRandomBookmarkColor,
} from "./syncBookmarks";
