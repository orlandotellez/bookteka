import { useState, useEffect, useCallback } from "react";
import { ReaderHeader } from "./ReaderHeader";
import { TextReader } from "./TextReader";
import { BookmarksPanel } from "./BooksmarksPanel";
import { useBookStore } from "@/store/bookStore";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { useStreakStore } from "@/store/streakStore";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { ReadingControls, type ReadingSettings } from "./ReadingControls";
import type { Highlight, HighlightColor, Bookmark } from "@/types/book";
import styles from "./Reader.module.css";
import { Loading } from "@/components/common/Loading";

interface ReaderProps {
  book: {
    id: string;
    name: string;
    text: string;
    scrollPosition: number;
    totalPages?: number;
  };
}

export const Reader = ({ book }: ReaderProps) => {
  const {
    updateScrollPosition,
    updateReadingTime,
    setCurrentView,
    loadBookmarks,
    addBookmark,
    removeBookmark,
    loadHighlights,
    addHighlight,
  } = useBookStore();
  const { isRunning, sessionSeconds, start, pause } = useReadingTimer({
    onTimeUpdate: (seconds) => {
      if (seconds > 0) {
        updateReadingTime(book.id, seconds);
      }
    },
  });
  const {
    streakData,
    loadStreakData,
    completeDay,
    initializeStreak,
    isStreakLoading,
  } = useStreakStore();
  const { defaultReadingSettings } = useUserPreferences();

  // Inicializar settings con las preferencias del usuario (ajustando textWidth para móvil)
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return {
      ...defaultReadingSettings,
      textWidth: isMobile ? 100 : defaultReadingSettings.textWidth,
    };
  });
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      const [loadedHighlights, loadedBookmarks] = await Promise.all([
        loadHighlights(book.id),
        loadBookmarks(book.id),
      ]);
      setHighlights(loadedHighlights);
      setBookmarks(loadedBookmarks);
      setIsLoadingData(false);
    };
    loadData();
    loadStreakData(); // Cargar datos de racha
  }, [book.id, loadHighlights, loadBookmarks, loadStreakData]);

  const handleClose = () => {
    pause();
    setCurrentView("library");
  };

  const handleScrollPositionChange = useCallback(
    async (position: number) => {
      await updateScrollPosition(book.id, position);
    },
    [book.id, updateScrollPosition],
  );

  const handleTimerToggle = () => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };

  // Manejar highlights
  const handleAddHighlight = useCallback(
    async (
      text: string,
      color: HighlightColor,
      paragraphIndex: number,
      startOffset: number,
      endOffset: number,
    ) => {
      const newHighlight: Highlight = {
        id: crypto.randomUUID(),
        bookId: book.id,
        text,
        color,
        paragraphIndex,
        startOffset,
        endOffset,
        createdAt: Date.now(),
      };

      await addHighlight(newHighlight);
      setHighlights((prev) => [...prev, newHighlight]);
    },
    [book.id, addHighlight],
  );

  // Manejar bookmarks (desde toolbar o desde panel)
  const handleAddBookmark = useCallback(
    async (nameOrText: string, textPreview?: string) => {
      const scrollY = window.scrollY;

      if (nameOrText.includes("|||")) {
        const [name, selectedText] = nameOrText.split("|||");

        const newBookmark: Bookmark = {
          id: crypto.randomUUID(),
          bookId: book.id,
          name: name.trim(),
          textPreview: selectedText,
          scrollPosition: scrollY,
          createdAt: Date.now(),
        };

        await addBookmark(newBookmark);
        setBookmarks((prev) => [...prev, newBookmark]);
        return;
      }

      const name = nameOrText;
      const preview = textPreview || "Texto seleccionado...";

      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        bookId: book.id,
        name,
        textPreview: preview,
        scrollPosition: scrollY,
        createdAt: Date.now(),
      };

      await addBookmark(newBookmark);
      setBookmarks((prev) => [...prev, newBookmark]);
    },
    [book.id, addBookmark],
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      await removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    },
    [removeBookmark],
  );

  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    window.scrollTo({ top: bookmark.scrollPosition, behavior: "smooth" });
  }, []);

  if (isLoadingData) {
    return <Loading text="Cargando libro..." />;
  }

  return (
    <div className={styles.reader}>
      <header className={`${styles.header} ${isZenMode ? styles.hidden : ""}`}>
        <ReaderHeader
          fileName={book.name}
          onClose={handleClose}
          onOpenBookmarks={() => setShowBookmarks(true)}
          showTimer={true}
          isTimerRunning={isRunning}
          sessionSeconds={sessionSeconds}
          onToggleTimer={handleTimerToggle}
          streakData={{
            currentStreak: streakData?.currentStreak ?? 0,
            hasCompletedToday: streakData?.hasCompletedToday ?? false,
            startDate: streakData?.startDate ?? null,
            onCompleteDay: completeDay,
            onInitialize: initializeStreak,
            isLoading: isStreakLoading,
          }}
        />
        <ReadingControls settings={settings} onSettingsChange={setSettings} />
      </header>

      <main className={`${styles.readerContent} ${isZenMode ? styles.zenModeContent : ""}`}>
        <TextReader
          text={book.text}
          settings={settings}
          highlights={highlights}
          initialScrollPosition={book.scrollPosition}
          totalPages={book.totalPages}
          onScrollPositionChange={handleScrollPositionChange}
          onAddHighlight={handleAddHighlight}
          onAddBookmark={handleAddBookmark}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(!isZenMode)}
        />
      </main>

      {showBookmarks && (
        <BookmarksPanel
          bookmarks={bookmarks}
          isOpen={showBookmarks}
          onClose={() => setShowBookmarks(false)}
          onAddBookmark={handleAddBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          onNavigateToBookmark={handleNavigateToBookmark}
        />
      )}
    </div>
  );
};
