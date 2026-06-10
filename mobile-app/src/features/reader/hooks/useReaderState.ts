import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type LayoutChangeEvent,
  type ScrollView as ScrollViewType,
} from "react-native"
import { useRouter } from "expo-router"

import type { Book, HighlightColor } from "@/shared/types/book"
import type { ReadingSettings } from "@/shared/types/reading"

import { parsePageMarkers, getCurrentPage, getPageScrollPosition } from "@/utils/pageDetector"
import { useReadingTimer } from "@/hooks/useReadingTimer"
import { useUserPreferences } from "@/shared/store/userPreferencesStore"
import { useBookStore } from "@/shared/store/bookStore"
import { useHighlights } from "@/hooks/useHighlights"
import { useBookmarks } from "@/hooks/useBookmarks"
import { getHighlightAtPosition } from "../utils/highlightUtils"
import type { SelectedText } from "../utils/highlightUtils"
import type { TextSelectorHandle } from "../components/TextSelector"

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  fontFamily: "sans",
  lineHeight: 1.7,
  textWidth: 100,
}

export function useReaderState(book: Book) {
  const router = useRouter()

  // ── Stores ─────────────────────────────────────────────────
  const { defaultReadingSettings, setDefaultReadingSettings } = useUserPreferences()
  const { updateScrollPosition, updateReadingTime } = useBookStore()

  // ── Highlights ─────────────────────────────────────────────
  const {
    highlights,
    loadHighlights,
    addHighlight,
    removeHighlight,
    getHighlightsForParagraph,
  } = useHighlights()

  // ── Bookmarks ──────────────────────────────────────────────
  const {
    bookmarks,
    loadBookmarks: loadBookmarksFromHook,
    addBookmark: addBookmarkToHook,
    removeBookmark: removeBookmarkFromHook,
    isCurrentPageBookmarked,
  } = useBookmarks()

  // ── UI state ───────────────────────────────────────────────
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<SelectedText | null>(null)
  const [showSelectMode] = useState(false)
  const [pendingRemoveHighlightId, setPendingRemoveHighlightId] = useState<string | null>(null)
  const textSelectorRef = useRef<TextSelectorHandle>(null)

  // ── Load data on mount ─────────────────────────────────────
  useEffect(() => {
    loadHighlights(book.id)
    loadBookmarksFromHook(book.id)
  }, [book.id, loadHighlights, loadBookmarksFromHook])

  // ── Text parsing ──────────────────────────────────────────
  const { paragraphs, pageMarkers, totalPages } = useMemo(
    () => parsePageMarkers(book.text || ""),
    [book.text],
  )
  const hasText = paragraphs.length > 0

  // ── Reading settings ──────────────────────────────────────
  const [settings, setSettings] = useState<ReadingSettings>({
    ...DEFAULT_SETTINGS,
    ...defaultReadingSettings,
  })

  const handleSettingsChange = useCallback(
    (newSettings: ReadingSettings) => {
      setSettings(newSettings)
      setDefaultReadingSettings(newSettings)
    },
    [setDefaultReadingSettings],
  )

  const [showSettings, setShowSettings] = useState(false)

  // ── Reading timer ─────────────────────────────────────────
  const { isRunning, sessionSeconds, start, pause, toggle } = useReadingTimer({
    onTimeUpdate: (seconds) => {
      if (seconds > 0) {
        updateReadingTime(book.id, seconds)
      }
    },
  })

  // Auto-start timer when reader opens
  useEffect(() => {
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Scroll tracking ───────────────────────────────────────
  const scrollViewRef = useRef<ScrollViewType>(null)
  const paragraphOffsets = useRef<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [viewHeight, setViewHeight] = useState(0)

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y
      setScrollOffset(offsetY)

      const page = getCurrentPage(
        offsetY,
        paragraphOffsets.current,
        pageMarkers,
        viewHeight || event.nativeEvent.layoutMeasurement.height || 600,
        totalPages,
      )
      setCurrentPage(page)
    },
    [pageMarkers, totalPages, viewHeight],
  )

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y
      updateScrollPosition(book.id, offsetY)
    },
    [book.id, updateScrollPosition],
  )

  // Restore scroll position on mount
  useEffect(() => {
    if (book.scrollPosition > 0 && scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: book.scrollPosition, animated: false })
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Paragraph layout tracking ────────────────────────────
  const handleParagraphLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout
      paragraphOffsets.current[index] = y
    },
    [],
  )

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    setContentHeight(h)
  }, [])

  const handleViewLayout = useCallback((event: LayoutChangeEvent) => {
    setViewHeight(event.nativeEvent.layout.height)
  }, [])

  // ── Page navigation ───────────────────────────────────────
  const navigateToPage = useCallback(
    (pageNumber: number) => {
      const targetY = getPageScrollPosition(
        pageNumber,
        pageMarkers,
        paragraphOffsets.current,
        totalPages,
      )

      scrollViewRef.current?.scrollTo({ y: targetY, animated: true })
      setCurrentPage(pageNumber)
    },
    [pageMarkers, totalPages],
  )

  // ── Highlight handlers ─────────────────────────────────────
  const handleHighlightModeToggle = useCallback(() => {
    textSelectorRef.current?.enterSelectionMode()
  }, [])

  const handleTextSelection = useCallback(
    (selection: SelectedText | null) => {
      if (selection) {
        setPendingSelection(selection)
        setShowToolbar(true)
      }
    },
    [],
  )

  const handleParagraphLongPress = useCallback(
    (paragraphIndex: number) => {
      const paraText = paragraphs[paragraphIndex]
      if (!paraText || paraText.trim().length === 0) return

      setPendingSelection({
        text: paraText,
        paragraphIndex,
        startOffset: 0,
        endOffset: paraText.length,
      })
      setShowToolbar(true)
    },
    [paragraphs],
  )

  const handleHighlightColorSelect = useCallback(
    async (color: HighlightColor) => {
      if (!pendingSelection) return

      try {
        await addHighlight(
          pendingSelection.text,
          color,
          pendingSelection.paragraphIndex,
          pendingSelection.startOffset,
          pendingSelection.endOffset,
          book.id,
        )
      } catch (error) {
        console.error("[Reader] Error adding highlight:", error)
      }

      setShowToolbar(false)
      setPendingSelection(null)
    },
    [pendingSelection, addHighlight, book.id],
  )

  const handleHighlightRemove = useCallback(async () => {
    if (!pendingRemoveHighlightId) return

    try {
      await removeHighlight(pendingRemoveHighlightId)
    } catch (error) {
      console.error("[Reader] Error removing highlight:", error)
    }

    setShowToolbar(false)
    setPendingRemoveHighlightId(null)
    setPendingSelection(null)
  }, [pendingRemoveHighlightId, removeHighlight])

  const handleParagraphTap = useCallback(
    (paragraphIndex: number, _eventOffset: number) => {
      const highlight = getHighlightAtPosition(
        highlights,
        paragraphIndex,
        _eventOffset,
      )
      if (highlight) {
        setPendingRemoveHighlightId(highlight.id)
        setPendingSelection({
          text: highlight.text,
          paragraphIndex,
          startOffset: highlight.startOffset,
          endOffset: highlight.endOffset,
        })
        setShowToolbar(true)
      }
    },
    [highlights],
  )

  // ── Get page text preview helper ──────────────────────────
  const getPagePreview = useCallback(
    (pageNumber: number, maxChars = 50): string => {
      if (!paragraphs.length) return ""

      const marker = pageMarkers.find((m) => m.pageNumber === pageNumber)
      if (marker) {
        const text = paragraphs[marker.paragraphIndex]
        if (text) return text.replace(/\s+/g, " ").trim().slice(0, maxChars)
      }

      if (pageNumber === 1 && paragraphs.length > 0) {
        return paragraphs[0].replace(/\s+/g, " ").trim().slice(0, maxChars)
      }

      return ""
    },
    [paragraphs, pageMarkers],
  )

  // ── Bookmark handlers ──────────────────────────────────────
  const handleAddBookmark = useCallback(
    async (name: string) => {
      const preview = getPagePreview(currentPage)
      try {
        await addBookmarkToHook({
          bookId: book.id,
          name,
          pageNumber: currentPage,
          textPreview: preview,
        })
      } catch (error) {
        console.error("[Reader] Error adding bookmark:", error)
      }
    },
    [book.id, currentPage, addBookmarkToHook, getPagePreview],
  )

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      try {
        await removeBookmarkFromHook(id)
      } catch (error) {
        console.error("[Reader] Error removing bookmark:", error)
      }
    },
    [removeBookmarkFromHook],
  )

  const handleQuickBookmarkToggle = useCallback(async () => {
    if (isCurrentPageBookmarked(currentPage)) {
      const bookmark = bookmarks.find(
        (b) => b.pageNumber === currentPage,
      )
      if (bookmark) {
        await removeBookmarkFromHook(bookmark.id)
      }
    } else {
      const preview = getPagePreview(currentPage)
      try {
        await addBookmarkToHook({
          bookId: book.id,
          name: `Página ${currentPage}`,
          pageNumber: currentPage,
          textPreview: preview,
        })
      } catch (error) {
        console.error("[Reader] Error quick-adding bookmark:", error)
      }
    }
  }, [
    currentPage,
    isCurrentPageBookmarked,
    bookmarks,
    removeBookmarkFromHook,
    addBookmarkToHook,
    book.id,
    getPagePreview,
  ])

  const handleToolbarClose = useCallback(() => {
    setShowToolbar(false)
    setPendingSelection(null)
    setPendingRemoveHighlightId(null)
  }, [])

  // ── Close handler ────────────────────────────────────────
  const handleClose = useCallback(() => {
    pause()
    router.back()
  }, [pause, router])

  // ── Return aggregated state and handlers ──────────────────
  return {
    // State
    highlights,
    bookmarks,
    settings,
    currentPage,
    totalPages,
    hasText,
    paragraphs,
    pageMarkers,
    showToolbar,
    showSettings,
    showBookmarksPanel,
    showSelectMode,
    pendingRemoveHighlightId,
    pendingSelection,
    isRunning,
    sessionSeconds,
    scrollOffset,
    contentHeight,
    viewHeight,

    // Refs
    scrollViewRef,
    textSelectorRef,
    paragraphOffsets,

    // Getters
    getHighlightsForParagraph,
    isCurrentPageBookmarked,
    getPagePreview,

    // Setters
    setShowToolbar,
    setShowSettings,
    setShowBookmarksPanel,

    // Handlers
    handleScroll,
    handleScrollEnd,
    handleParagraphLayout,
    handleContentSizeChange,
    handleViewLayout,
    navigateToPage,
    handleHighlightModeToggle,
    handleTextSelection,
    handleParagraphLongPress,
    handleHighlightColorSelect,
    handleHighlightRemove,
    handleParagraphTap,
    handleAddBookmark,
    handleDeleteBookmark,
    handleQuickBookmarkToggle,
    handleToolbarClose,
    handleClose,
    handleSettingsChange,
    toggle,
  }
}
