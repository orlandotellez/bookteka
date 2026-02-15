import { useState, useEffect, useCallback } from "react";
import { ReaderHeader } from "./ReaderHeader";
import { TextReader } from "./TextReader";
import { BookmarksPanel } from "./BooksmarksPanel";
import { useBookStore } from "@/store/bookStore";
import { useReadingTimer } from "@/hooks/useReadingTimer";
import { ReadingControls, type ReadingSettings } from "./ReadingControls";
import type { Highlight, HighlightColor, Bookmark } from "@/types/book";
import styles from "./Reader.module.css";

interface ReaderProps {
  book: {
    id: string;
    name: string;
    text: string;
    scrollPosition: number;
    totalPages?: number;
  };
}

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 16,
  fontFamily: "sans",
  lineHeight: 1.6,
  textWidth: 80,
};

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
  const { isRunning, sessionSeconds, start, pause } = useReadingTimer();
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Cargar highlights y bookmarks al montar el componente
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
  }, [book.id, loadHighlights, loadBookmarks]);

  const handleClose = () => {
    pause();
    // Actualizar tiempo total en la base de datos
    updateReadingTime(book.id, sessionSeconds);
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
      // Actualizar tiempo total en la base de datos
      updateReadingTime(book.id, sessionSeconds);
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

  // Actualizar tiempo de lectura cuando se detiene el timer
  useEffect(() => {
    return () => {
      if (sessionSeconds > 0) {
        updateReadingTime(book.id, sessionSeconds);
      }
    };
  }, [sessionSeconds, book.id, updateReadingTime]);

  if (isLoadingData) {
    return (
      <div className={styles.reader}>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          Cargando libro...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reader}>
      <header className={styles.header}>
        <ReaderHeader
          fileName={book.name}
          onClose={handleClose}
          onOpenBookmarks={() => setShowBookmarks(true)}
          showTimer={true}
          isTimerRunning={isRunning}
          sessionSeconds={sessionSeconds}
          onToggleTimer={handleTimerToggle}
        />
        <ReadingControls settings={settings} onSettingsChange={setSettings} />
      </header>

      <main className={styles.readerContent}>
        <TextReader
          text={book.text}
          settings={settings}
          highlights={highlights}
          initialScrollPosition={book.scrollPosition}
          totalPages={book.totalPages}
          onScrollPositionChange={handleScrollPositionChange}
          onAddHighlight={handleAddHighlight}
          onAddBookmark={handleAddBookmark}
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
