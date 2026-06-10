export { setCurrentUserId, getCurrentUserId, getDatabase, clearDatabase, resetDatabase } from "./connection"

export { createTables, dropTables } from "./schema"

export { getAllBooks, getBookById, addBook, updateBook, deleteBook } from "./features/books"
export { getAllBookmarks, getBookmarksByBook, addBookmark, removeBookmark } from "./features/bookmarks"
export { getHighlightsByBook, addHighlight, removeHighlight } from "./features/highlights"
export { getStreakData, saveStreakData } from "./features/streaks"
export { getUserProfile, getOrCreateUserProfile, updateUserReadingTime, getTotalReadingTime } from "./features/user"
