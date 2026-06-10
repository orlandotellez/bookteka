import { useState, useCallback, useRef } from "react"
import { generateId } from "@/utils/generateId"
import type { Bookmark } from "@/shared/types/book"
import { useBookStore } from "@/shared/store/bookStore"

interface UseBookmarksReturn {
  /** All bookmarks for the current book, sorted by pageNumber ascending */
  bookmarks: Bookmark[]
  /** True while loading from database */
  isLoading: boolean
  /** Load all bookmarks for a given book ID */
  loadBookmarks: (bookId: string) => Promise<void>
  /**
   * Add a new bookmark.
   * Persists to DB and updates local state.
   * Returns the created Bookmark with its generated ID.
   */
  addBookmark: (
    bookmark: Omit<Bookmark, "id" | "createdAt">,
  ) => Promise<Bookmark>
  /** Remove a bookmark by its ID. Persists to DB. */
  removeBookmark: (id: string) => Promise<void>
  /** Check if a specific page already has a bookmark */
  isCurrentPageBookmarked: (pageNumber: number) => boolean
}

export function useBookmarks(): UseBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const {
    loadBookmarks: loadFromStore,
    addBookmark: addToStore,
    removeBookmark: removeFromStore,
  } = useBookStore()

  // Track which book is currently loaded to avoid stale data
  const currentBookIdRef = useRef<string | null>(null)

  const loadBookmarks = useCallback(
    async (bookId: string) => {
      setIsLoading(true)
      currentBookIdRef.current = bookId
      try {
        const loaded = await loadFromStore(bookId)
        // Only update state if we're still on the same book
        if (currentBookIdRef.current === bookId) {
          setBookmarks(loaded)
        }
      } catch (error) {
        console.error("[useBookmarks] Error loading bookmarks:", error)
      } finally {
        if (currentBookIdRef.current === bookId) {
          setIsLoading(false)
        }
      }
    },
    [loadFromStore],
  )

  const addBookmark = useCallback(
    async (
      bookmark: Omit<Bookmark, "id" | "createdAt">,
    ): Promise<Bookmark> => {
      const newBookmark: Bookmark = {
        ...bookmark,
        id: generateId(),
        createdAt: Date.now(),
      }

      try {
        await addToStore(newBookmark)
        setBookmarks((prev) =>
          [...prev, newBookmark].sort((a, b) => a.pageNumber - b.pageNumber),
        )
        return newBookmark
      } catch (error) {
        console.error("[useBookmarks] Error adding bookmark:", error)
        throw error
      }
    },
    [addToStore],
  )

  const removeBookmark = useCallback(
    async (id: string) => {
      try {
        await removeFromStore(id)
        setBookmarks((prev) => prev.filter((b) => b.id !== id))
      } catch (error) {
        console.error("[useBookmarks] Error removing bookmark:", error)
        throw error
      }
    },
    [removeFromStore],
  )

  const isCurrentPageBookmarked = useCallback(
    (pageNumber: number) => {
      return bookmarks.some((b) => b.pageNumber === pageNumber)
    },
    [bookmarks],
  )

  return {
    bookmarks,
    isLoading,
    loadBookmarks,
    addBookmark,
    removeBookmark,
    isCurrentPageBookmarked,
  }
}
