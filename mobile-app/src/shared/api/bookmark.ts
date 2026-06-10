/**
 * API functions for bookmark operations.
 *
 * Ported from web-app/src/api/bookmark.ts
 */

import { ENV } from "../constants/env"


// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreateBookmarkPayload {
  name: string
  pageNumber: number
  textPreview?: string
}

export interface BookmarkResponse {
  id: string
  userId: string
  userBookId: string
  name: string
  pageNumber: number
  textPreview: string | null
  createdAt: string
}

// ─── Bookmark CRUD ─────────────────────────────────────────────────────────

/**
 * Create a new bookmark for a book.
 */
export async function createBookmark(
  bookId: string,
  data: CreateBookmarkPayload,
): Promise<BookmarkResponse> {
  const response = await fetch(`${ENV.API_URL}/books/${bookId}/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Error al crear marcador")
  }

  return response.json()
}

/**
 * Get all bookmarks for a book.
 */
export async function getBookmarks(
  bookId: string,
): Promise<BookmarkResponse[]> {
  const response = await fetch(`${ENV.API_URL}/books/${bookId}/bookmarks`, {
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Error al obtener marcadores")
  }

  return response.json()
}

/**
 * Delete a bookmark.
 */
export async function deleteBookmark(
  bookId: string,
  bookmarkId: string,
): Promise<void> {
  const response = await fetch(
    `${ENV.API_URL}/books/${bookId}/bookmarks/${bookmarkId}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || "Error al eliminar marcador")
  }
}
