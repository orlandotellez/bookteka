import { useState, useCallback, useRef } from "react"
import { generateId } from "@/utils/generateId"
import type { Highlight, HighlightColor } from "@/shared/types/book"
import { useBookStore } from "@/shared/store/bookStore"

interface UseHighlightsReturn {
  /** All highlights for the current book */
  highlights: Highlight[]
  /** True while loading from database */
  isLoading: boolean
  /** Load all highlights for a given book ID */
  loadHighlights: (bookId: string) => Promise<void>
  /**
   * Add a new highlight.
   * Persists to DB and updates local state.
   * Returns the created Highlight with its generated ID.
   */
  addHighlight: (
    text: string,
    color: HighlightColor,
    paragraphIndex: number,
    startOffset: number,
    endOffset: number,
    bookId: string,
  ) => Promise<Highlight>
  /**
   * Remove a highlight by its ID.
   * Persists to DB and removes from local state.
   */
  removeHighlight: (id: string) => Promise<void>
  /** Get all highlights that belong to a specific paragraph */
  getHighlightsForParagraph: (paragraphIndex: number) => Highlight[]
  /** Check if a specific character position in a paragraph is highlighted */
  isPositionHighlighted: (paragraphIndex: number, offset: number) => boolean
}

export function useHighlights(): UseHighlightsReturn {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const {
    loadHighlights: loadFromStore,
    addHighlight: addToStore,
    removeHighlight: removeFromStore,
  } = useBookStore()

  // Track which book is currently loaded to avoid stale data
  const currentBookIdRef = useRef<string | null>(null)

  const loadHighlights = useCallback(
    async (bookId: string) => {
      setIsLoading(true)
      currentBookIdRef.current = bookId
      try {
        const loaded = await loadFromStore(bookId)
        // Only update state if we're still on the same book
        if (currentBookIdRef.current === bookId) {
          setHighlights(loaded)
        }
      } catch (error) {
        console.error("[useHighlights] Error loading highlights:", error)
      } finally {
        if (currentBookIdRef.current === bookId) {
          setIsLoading(false)
        }
      }
    },
    [loadFromStore],
  )

  const addHighlight = useCallback(
    async (
      text: string,
      color: HighlightColor,
      paragraphIndex: number,
      startOffset: number,
      endOffset: number,
      bookId: string,
    ): Promise<Highlight> => {
      const newHighlight: Highlight = {
        id: generateId(),
        bookId,
        text,
        color,
        paragraphIndex,
        startOffset,
        endOffset,
        createdAt: Date.now(),
      }

      try {
        await addToStore(newHighlight)
        setHighlights((prev) => [...prev, newHighlight])
        return newHighlight
      } catch (error) {
        console.error("[useHighlights] Error adding highlight:", error)
        throw error
      }
    },
    [addToStore],
  )

  const removeHighlight = useCallback(
    async (id: string) => {
      try {
        await removeFromStore(id)
        setHighlights((prev) => prev.filter((h) => h.id !== id))
      } catch (error) {
        console.error("[useHighlights] Error removing highlight:", error)
        throw error
      }
    },
    [removeFromStore],
  )

  const getHighlightsForParagraph = useCallback(
    (paragraphIndex: number): Highlight[] => {
      return highlights.filter((h) => h.paragraphIndex === paragraphIndex)
    },
    [highlights],
  )

  const isPositionHighlighted = useCallback(
    (paragraphIndex: number, offset: number): boolean => {
      return highlights.some(
        (h) =>
          h.paragraphIndex === paragraphIndex &&
          offset >= h.startOffset &&
          offset < h.endOffset,
      )
    },
    [highlights],
  )

  return {
    highlights,
    isLoading,
    loadHighlights,
    addHighlight,
    removeHighlight,
    getHighlightsForParagraph,
    isPositionHighlighted,
  }
}
