/**
 * API barrel export.
 */

export {
  uploadBook,
  downloadBookUrl,
  deleteBookInCloud,
  updateBookProgress,
  getSignedDownloadUrl,
} from "./book"
export type { BookProgressData } from "./book"

export { createBookmark, getBookmarks, deleteBookmark } from "./bookmark"
export type { CreateBookmarkPayload, BookmarkResponse } from "./bookmark"

export {
  syncBooksFromCloud,
  syncBookmarksFromCloud,
  syncHighlightsFromCloud,
} from "./sync"
