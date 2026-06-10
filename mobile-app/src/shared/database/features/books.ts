import type { Book, Bookmark, Highlight } from "@/shared/types/book"
import { getDatabase, getCurrentUserId } from "../connection"

function rowToBook(row: any): Book {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    name: row.name,
    readingTimeSeconds: row.readingTimeSeconds ?? 0,
    scrollPosition: row.scrollPosition ?? 0,
    lastReadAt: row.lastReadAt,
    text: row.text ?? "",
    createdAt: row.createdAt,
    totalPages: row.totalPages ?? undefined,
    fileUri: row.fileUri ?? undefined,
    fileUrl: row.fileUrl ?? undefined,
    fileKey: row.fileKey ?? undefined,
    isSynced: row.isSynced === 1,
  }
}

export async function getAllBooks(): Promise<Book[]> {
  const uid = getCurrentUserId()
  if (!uid) return []

  const db = await getDatabase()
  const rows = await db.getAllAsync(
    "SELECT * FROM books WHERE userId = ? ORDER BY lastReadAt DESC",
    [uid],
  )
  return rows.map(rowToBook)
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const uid = getCurrentUserId()
  if (!uid) return undefined

  const db = await getDatabase()
  const row = await db.getFirstAsync(
    "SELECT * FROM books WHERE id = ? AND userId = ?",
    [id, uid],
  )
  return row ? rowToBook(row) : undefined
}

export async function addBook(book: Book): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()
  await db.runAsync(
    `INSERT INTO books (id, userId, name, readingTimeSeconds, scrollPosition, lastReadAt, text, createdAt, totalPages, fileUri, fileUrl, fileKey, isSynced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.id,
      uid,
      book.name,
      book.readingTimeSeconds ?? 0,
      book.scrollPosition ?? 0,
      book.lastReadAt ?? Date.now(),
      book.text ?? "",
      book.createdAt ?? Date.now(),
      book.totalPages ?? null,
      book.fileUri ?? null,
      book.fileUrl ?? null,
      book.fileKey ?? null,
      book.isSynced ? 1 : 0,
    ],
  )
}

export async function updateBook(book: Partial<Book> & { id: string }): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) return

  const db = await getDatabase()
  const existing = await db.getFirstAsync(
    "SELECT * FROM books WHERE id = ? AND userId = ?",
    [book.id, uid],
  )
  if (!existing) return

  const merged = { ...(existing as any), ...book, userId: uid }

  await db.runAsync(
    `UPDATE books SET name = ?, readingTimeSeconds = ?, scrollPosition = ?, lastReadAt = ?, text = ?, totalPages = ?, fileUri = ?, fileUrl = ?, fileKey = ?, isSynced = ?
     WHERE id = ? AND userId = ?`,
    [
      merged.name,
      merged.readingTimeSeconds ?? 0,
      merged.scrollPosition ?? 0,
      merged.lastReadAt ?? Date.now(),
      merged.text ?? "",
      merged.totalPages ?? null,
      merged.fileUri ?? null,
      merged.fileUrl ?? null,
      merged.fileKey ?? null,
      merged.isSynced ? 1 : 0,
      merged.id,
      uid,
    ],
  )
}

export async function deleteBook(id: string): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) return

  const db = await getDatabase()

  // Cascade delete: remove associated bookmarks and highlights first
  await db.runAsync("DELETE FROM bookmarks WHERE bookId = ? AND userId = ?", [id, uid])
  await db.runAsync("DELETE FROM highlights WHERE bookId = ? AND userId = ?", [id, uid])
  await db.runAsync("DELETE FROM books WHERE id = ? AND userId = ?", [id, uid])
}
