import { getBookById, addBook } from "@/shared/database"
import type { Book, Bookmark, Highlight } from "@/shared/types/book"

// ─── Cloud Sync Helpers ────────────────────────────────────────────────────

export async function syncBooksFromCloud(): Promise<Book[]> {
  const response = await fetch(`${ENV.API_URL}/books`, {
    credentials: "include",
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "sin cuerpo")
    throw new Error(
      `Error al obtener libros del servidor: ${response.status} ${response.statusText} — ${body}`,
    )
  }

  const cloudBooks: Book[] = await response.json()

  // Merge each cloud book with local data to preserve local progress
  for (const cloudBook of cloudBooks) {
    const localBook = await getBookById(cloudBook.id)

    const localTime = localBook?.readingTimeSeconds ?? 0
    const cloudTime = cloudBook.readingTimeSeconds ?? 0
    const localScroll = localBook?.scrollPosition ?? 0
    const cloudScroll = cloudBook.scrollPosition ?? 0
    const localLastRead = localBook?.lastReadAt ?? 0
    const cloudLastRead = cloudBook.lastReadAt ?? 0

    const mergedBook: Book = {
      ...cloudBook,
      // Always take the max to not lose progress
      readingTimeSeconds: Math.max(localTime, cloudTime),
      scrollPosition: Math.max(localScroll, cloudScroll),
      lastReadAt: Math.max(localLastRead, cloudLastRead) || Date.now(),
      // Preserve the PDF text if it exists locally
      text: localBook?.text || cloudBook.text || "",
      // Preserve local file URI (cloud won't have it)
      fileUri: localBook?.fileUri,
      // Mark as synced since it came from the cloud
      isSynced: true,
    }

    await addBook(mergedBook)
  }

  console.log(
    `Sincronizados ${cloudBooks.length} libros desde la nube (con merge de progreso local)`,
  )
  return cloudBooks
}

export async function syncBookmarksFromCloud(bookId: string): Promise<void> {
  const response = await fetch(`${ENV.API_URL}/books/${bookId}/bookmarks`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Error al sincronizar marcadores")
  }

  const cloudBookmarks: Bookmark[] = await response.json()

  // Save each bookmark to local DB
  for (const bookmark of cloudBookmarks) {
    await addBookmarkToDB(bookmark)
  }

  console.log(
    `Sincronizados ${cloudBookmarks.length} marcadores para el libro ${bookId}`,
  )
}

export async function syncHighlightsFromCloud(bookId: string): Promise<void> {
  const response = await fetch(`${ENV.API_URL}/books/${bookId}/highlights`, {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Error al sincronizar resaltados")
  }

  const cloudHighlights: Highlight[] = await response.json()

  // Save each highlight to local DB
  for (const highlight of cloudHighlights) {
    await addHighlightToDB(highlight)
  }

  console.log(
    `Sincronizados ${cloudHighlights.length} resaltados para el libro ${bookId}`,
  )
}

// ─── Internal helpers (avoiding circular deps with database barrel) ────────

import { getDatabase, getCurrentUserId } from "@/shared/database/connection"
import { ENV } from "../constants/env"

async function addBookmarkToDB(bookmark: Bookmark): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()
  await db.runAsync(
    `INSERT OR REPLACE INTO bookmarks (id, userId, bookId, name, pageNumber, textPreview, createdAt)
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

async function addHighlightToDB(highlight: Highlight): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()
  await db.runAsync(
    `INSERT OR REPLACE INTO highlights (id, userId, bookId, text, color, paragraphIndex, startOffset, endOffset, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      highlight.id,
      uid,
      highlight.bookId,
      highlight.text,
      highlight.color,
      highlight.paragraphIndex,
      highlight.startOffset,
      highlight.endOffset,
      highlight.createdAt ?? Date.now(),
    ],
  )
}
