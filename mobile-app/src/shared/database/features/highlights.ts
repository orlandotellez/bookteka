import type { Highlight } from "@/shared/types/book"
import { getDatabase, getCurrentUserId } from "../connection"

export async function getHighlightsByBook(bookId: string): Promise<Highlight[]> {
  const uid = getCurrentUserId()
  if (!uid) return []

  const db = await getDatabase()
  const rows = await db.getAllAsync(
    "SELECT * FROM highlights WHERE bookId = ? AND userId = ? ORDER BY paragraphIndex ASC",
    [bookId, uid],
  )
  return rows.map(rowToHighlight)
}

export async function addHighlight(highlight: Highlight): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) throw new Error("No hay usuario autenticado")

  const db = await getDatabase()
  await db.runAsync(
    `INSERT INTO highlights (id, userId, bookId, text, color, paragraphIndex, startOffset, endOffset, createdAt)
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

export async function removeHighlight(id: string): Promise<void> {
  const uid = getCurrentUserId()
  if (!uid) return

  const db = await getDatabase()
  await db.runAsync("DELETE FROM highlights WHERE id = ? AND userId = ?", [id, uid])
}

function rowToHighlight(row: any): Highlight {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    bookId: row.bookId,
    text: row.text,
    color: row.color,
    paragraphIndex: row.paragraphIndex,
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    createdAt: row.createdAt,
  }
}
