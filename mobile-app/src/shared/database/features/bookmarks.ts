import type { Bookmark } from "@/shared/types/book"
import { getDatabase, getCurrentUserId } from "../connection"

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const uid = getCurrentUserId()
  if (!uid) return []

  const db = await getDatabase()
  const rows = await db.getAllAsync(
    "SELECT * FROM bookmarks WHERE userId = ? ORDER BY createdAt DESC",
    [uid],
  )
  return rows.map(rowToBookmark)
}

export async function getBookmarksByBook(bookId: string): Promise<Bookmark[]> {
  const uid = getCurrentUserId()
  if (!uid) return []

  const db = await getDatabase()
  const rows = await db.getAllAsync(
    "SELECT * FROM bookmarks WHERE bookId = ? AND userId = ? ORDER BY pageNumber ASC",
    [bookId, uid],
  )
  return rows.map(rowToBookmark)
}

export async function addBookmark(bookmark: Bookmark): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()
  await db.runAsync(
    `INSERT INTO bookmarks (id, userId, bookId, name, pageNumber, textPreview, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      bookmark.id,
      uid,
      bookmark.bookId,
      bookmark.name,
      bookmark.pageNumber,
      bookmark.textPreview,
      bookmark.createdAt ?? Date.now(),
    ],
  )
}

export async function removeBookmark(id: string): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) return

  const db = await getDatabase()
  await db.runAsync("DELETE FROM bookmarks WHERE id = ? AND userId = ?", [id, uid])
}

function rowToBookmark(row: any): Bookmark {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    bookId: row.bookId,
    name: row.name,
    pageNumber: row.pageNumber,
    textPreview: row.textPreview,
    createdAt: row.createdAt,
  }
}
