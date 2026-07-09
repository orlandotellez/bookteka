import { useState, useEffect, useCallback, useRef } from "react";
import { ReaderHeader } from "./ReaderHeader";
import { TextReader, type TextReaderHandle } from "./TextReader";
import { BookmarksPanel } from "./BooksmarksPanel";
import {
  useBookStore,
  flushPendingCloudProgress,
} from "@/store/bookStore";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { useStreakStore } from "@/store/streakStore";
import { useUserPreferences } from "@/store/userPreferencesStore";
import { ReadingControls, type ReadingSettings } from "./ReadingControls";
import type { Highlight, HighlightColor, Bookmark } from "@/types/book";
import styles from "./Reader.module.css";
import { Loading } from "@/components/common/Loading";
import { generateId } from "@/utils/generateId";

// Colores disponibles para asignar aleatoriamente a marcadores
const BOOKMARK_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];

function getRandomBookmarkColor(): HighlightColor {
  return BOOKMARK_COLORS[Math.floor(Math.random() * BOOKMARK_COLORS.length)];
}

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
    updateBookmark,
    removeBookmark,
    loadHighlights,
    addHighlight,
    removeHighlight,
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
  const textReaderRef = useRef<TextReaderHandle>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(() => {
    const flushWithKeepalive = () => {
      flushPendingCloudProgress(book.id, { keepalive: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushWithKeepalive();
    };

    window.addEventListener("pagehide", flushWithKeepalive);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushWithKeepalive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [book.id]);

  useEffect(() => {
    return () => {
      flushPendingCloudProgress(book.id);
    };
  }, [book.id]);

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

  const handleRemoveHighlight = useCallback(
    async (id: string) => {
      await removeHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    },
    [removeHighlight],
  );

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
        id: generateId(),
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
      try {
        const bookmarkName = nameOrText.trim();

        if (!bookmarkName) {
          console.warn("[Bookmark] Nombre vacío, no se guarda");
          return;
        }

        let name: string;
        let preview: string;

        if (nameOrText.includes("|||")) {
          const parts = nameOrText.split("|||");
          name = parts[0]?.trim() || bookmarkName;
          preview = parts.slice(1).join("|||") || "";
        } else {
          name = bookmarkName;
          preview = textPreview || "";
        }

        const newBookmark: Bookmark = {
          id: generateId(),
          bookId: book.id,
          name,
          textPreview: preview,
          pageNumber: currentPage,
          color: getRandomBookmarkColor(),
          createdAt: Date.now(),
        };

        console.debug("[Bookmark] Guardando:", newBookmark);
        const savedBookmark = await addBookmark(newBookmark);
        setBookmarks((prev) => [...prev, savedBookmark]);
        console.debug("[Bookmark] Guardado exitoso:", savedBookmark.id);
      } catch (error) {
        console.error("[Bookmark] Error al guardar marcador:", error);
      }
    },
    [book.id, addBookmark, currentPage],
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      await removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    },
    [removeBookmark],
  );

  const handleUpdateBookmark = useCallback(
    async (id: string, data: { name?: string; textPreview?: string }) => {
      const updated = await updateBookmark(id, data);
      if (updated) {
        setBookmarks((prev) =>
          prev.map((b) => (b.id === id ? updated : b)),
        );
      }
      return updated;
    },
    [updateBookmark],
  );

  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    textReaderRef.current?.navigateToPage(bookmark.pageNumber);
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
          ref={textReaderRef}
          text={book.text}
          settings={settings}
          highlights={highlights}
          bookmarks={bookmarks}
          initialScrollPosition={book.scrollPosition}
          totalPages={book.totalPages}
          onScrollPositionChange={handleScrollPositionChange}
          onAddHighlight={handleAddHighlight}
          onRemoveHighlight={handleRemoveHighlight}
          onAddBookmark={handleAddBookmark}
          onPageChange={setCurrentPage}
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
          onUpdateBookmark={handleUpdateBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          onNavigateToBookmark={handleNavigateToBookmark}
        />
      )}
    </div>
  );
};
