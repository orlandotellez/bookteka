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
  const { updateScrollPosition, updateReadingTime, setCurrentView } =
    useBookStore();
  const { isRunning, sessionSeconds, start, pause } = useReadingTimer();
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

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
      
      setHighlights(prev => [...prev, newHighlight]);
      // TODO: Guardar en base de datos
    },
    []
  );

  // Manejar bookmarks
  const handleAddBookmark = useCallback((name: string) => {
    // Crear bookmark en la posición actual del scroll
    const scrollY = window.scrollY;
    const textPreview = "Texto seleccionado..."; // TODO: Obtener texto alrededor
    
    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      bookId: book.id,
      name,
      textPreview,
      scrollPosition: scrollY,
      createdAt: Date.now(),
    };
    
    setBookmarks(prev => [...prev, newBookmark]);
    // TODO: Guardar en base de datos
  }, []);

  const handleDeleteBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    // TODO: Eliminar de base de datos
  }, []);

  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    window.scrollTo({ top: bookmark.scrollPosition, behavior: 'smooth' });
  }, []);

  // Actualizar tiempo de lectura cuando se detiene el timer
  useEffect(() => {
    return () => {
      if (sessionSeconds > 0) {
        updateReadingTime(book.id, sessionSeconds);
      }
    };
  }, [sessionSeconds, book.id, updateReadingTime]);

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
