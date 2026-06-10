import { View, Text, StyleSheet } from "react-native"

import type { Book } from "@/shared/types/book"
import { THEME } from "@/shared/lib/theme"

import { useReaderState } from "../hooks/useReaderState"
import { ReaderHeader } from "./ReaderHeader"
import { ReaderContent } from "./ReaderContent"
import { HighlightToolbar } from "./HighlightToolbar"
import { PageNavigator } from "./PageNavigator"
import { BookmarksPanel } from "./BookmarksPanel"
import { TextSelector } from "./TextSelector"
import { ReadingControls } from "./ReadingControls"

interface ReaderProps {
  book: Book
}

export function Reader({ book }: ReaderProps) {
  const {
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
    isRunning,
    sessionSeconds,

    // Refs
    scrollViewRef,
    textSelectorRef,

    // Getters
    getHighlightsForParagraph,
    isCurrentPageBookmarked,

    // Setters
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
    handleParagraphTap,
    handleHighlightColorSelect,
    handleHighlightRemove,
    handleAddBookmark,
    handleDeleteBookmark,
    handleQuickBookmarkToggle,
    handleToolbarClose,
    handleClose,
    handleSettingsChange,
    toggle,
  } = useReaderState(book)

  // ── Empty state ──────────────────────────────────────────
  if (!hasText) {
    return (
      <View style={styles.screen}>
        <ReaderHeader
          bookName={book.name}
          bookmarksCount={0}
          isRunning={isRunning}
          sessionSeconds={sessionSeconds}
          onToggleTimer={toggle}
          onBack={handleClose}
          onBookmarksPress={() => { }}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Sin contenido</Text>
          <Text style={styles.emptySubtitle}>
            Este libro no tiene texto disponible para mostrar.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────── */}
      <ReaderHeader
        bookName={book.name}
        bookmarksCount={bookmarks.length}
        isRunning={isRunning}
        sessionSeconds={sessionSeconds}
        onToggleTimer={toggle}
        onBack={handleClose}
        onBookmarksPress={() => setShowBookmarksPanel(true)}
      />

      {/* ── Text content ──────────────────────────────────── */}
      <ReaderContent
        paragraphs={paragraphs}
        pageMarkers={pageMarkers}
        totalPages={totalPages}
        settings={settings}
        highlights={highlights}
        getHighlightsForParagraph={getHighlightsForParagraph}
        scrollViewRef={scrollViewRef}
        onScroll={handleScroll}
        onScrollEnd={handleScrollEnd}
        onContentSizeChange={handleContentSizeChange}
        onViewLayout={handleViewLayout}
        onParagraphLayout={handleParagraphLayout}
        onParagraphLongPress={handleParagraphLongPress}
        onParagraphTap={handleParagraphTap}
      />

      {/* ── Highlight Toolbar ──────────────────────────────── */}
      {showToolbar && (
        <HighlightToolbar
          visible={showToolbar}
          onSelectColor={handleHighlightColorSelect}
          onRemoveHighlight={
            pendingRemoveHighlightId ? handleHighlightRemove : undefined
          }
          onClose={handleToolbarClose}
          showRemoveOption={pendingRemoveHighlightId !== null}
        />
      )}

      {/* ── Page Navigator ─────────────────────────────────── */}
      <PageNavigator
        currentPage={currentPage}
        totalPages={totalPages}
        onNavigateToPage={navigateToPage}
        onOpenSettings={() => setShowSettings(true)}
        onToggleHighlight={handleHighlightModeToggle}
        isHighlightMode={showSelectMode}
        onToggleBookmark={handleQuickBookmarkToggle}
        isCurrentPageBookmarked={isCurrentPageBookmarked(currentPage)}
      />

      {/* ── Bookmarks Panel ────────────────────────────────── */}
      <BookmarksPanel
        visible={showBookmarksPanel}
        onClose={() => setShowBookmarksPanel(false)}
        bookmarks={bookmarks}
        currentPage={currentPage}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={handleDeleteBookmark}
        onNavigateToPage={navigateToPage}
      />

      {/* ── Text Selector ──────────────────────────────────── */}
      <TextSelector
        ref={textSelectorRef}
        paragraphs={paragraphs}
        onSelection={handleTextSelection}
      />

      {/* ── Reading Controls ───────────────────────────────── */}
      <ReadingControls
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.primaryColor,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.colors.fontColorTitle,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.fontColorText,
    textAlign: "center",
    lineHeight: 20,
  },
})
