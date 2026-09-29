import type { Book } from "@/types/book";
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { CardBook } from "@/components/pages/index/CardBook";
import { useBookStore } from "@/store/bookStore";
import { useUserPreferences } from "@/store/userPreferencesStore";
import type { LibraryView } from "@/types/reading";
import styles from "./Index.module.css";
import { CardBookList } from "@/components/pages/index/CardBookList";
import { normalizeText } from "@/utils/text";
import { ShowUploaderModal } from "@/components/modals/ShowUploaderModal";
import { Loading } from "@/components/common/Loading";
import { FilterBook } from "@/components/pages/index/FilterBook";
import { Pagination } from "@/components/pages/index/Pagination";
import BookShelfView from "@/components/pages/index/BookShelfView";
import { NoBooks } from "@/components/pages/index/NoBooks";

const ITEMS_PER_PAGE = 6;

type FilterStatus = "all" | "reading" | "unstarted";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode] = useState<LibraryView>(useUserPreferences.getState().defaultView);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    books,
    isLoading,
    deleteBook,
    getBookById,
    setCurrentBook,
    setCurrentView,
    showUploader,
    setShowUploader,
    addBook,
    isProcessingPdf,
    pdfProgress,
    downloadingBookId,
    moveBook,
  } = useBookStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-filter")) setIsFilterOpen(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const handleOpenBook = useCallback(
    async (book: Book) => {
      const freshBook = await getBookById(book.id);
      if (freshBook) {
        setCurrentBook(freshBook);
        setCurrentView("reader");
      }
    },
    [getBookById, setCurrentBook, setCurrentView],
  );

  const handleMove = useCallback(
    async (draggedId: string, beforeId: string | null, afterId: string | null) => {
      await moveBook(draggedId, beforeId, afterId);
    },
    [moveBook],
  );

  const processedBooks = useMemo(() => {
    let filtered = [...books];

    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      filtered = filtered.filter((b) => normalizeText(b.name).includes(q));
    }

    if (filterStatus === "reading") {
      filtered = filtered.filter((b) => b.scrollPosition > 0);
    } else if (filterStatus === "unstarted") {
      filtered = filtered.filter((b) => b.scrollPosition === 0);
    }

    return filtered;
  }, [books, searchQuery, filterStatus]);

  const shelfBooks = useMemo(() => {
    let filtered = [...books];

    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      filtered = filtered.filter((b) => normalizeText(b.name).includes(q));
    }

    if (filterStatus === "reading") {
      filtered = filtered.filter((b) => b.scrollPosition > 0);
    } else if (filterStatus === "unstarted") {
      filtered = filtered.filter((b) => b.scrollPosition === 0);
    }

    return filtered;
  }, [books, searchQuery, filterStatus]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return processedBooks.slice(start, end);
  }, [processedBooks, currentPage]);

  const totalPages = Math.ceil(processedBooks.length / ITEMS_PER_PAGE);

  const filterLabels: Record<FilterStatus, string> = {
    all: "Todos",
    reading: "Leyendo",
    unstarted: "sin empezar",
  };

  const handleCloseUploader = useCallback(() => {
    setShowUploader(false);
  }, [setShowUploader]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteBook(id);
        toast.success("Libro eliminado");
      } catch {
        toast.error("Error al eliminar el libro");
      }
    },
    [deleteBook],
  );

  const renderBooks = (booksToRender: Book[]) => {
    // `viewMode` viene de las preferencias del usuario, que vienen de
    // localStorage. Si ahí hubiera un valor corrupto, esta función devolvía
    // `undefined` y la grilla desaparecía sin error ni aviso.
    if (viewMode === "grid") {
      return (
        <div className={styles.cards}>
          {booksToRender.map((book) => (
            <CardBook
              key={book.id}
              book={book}
              onOpen={handleOpenBook}
              onDelete={handleDelete}
              isDownloading={isProcessingPdf && downloadingBookId === book.id}
              downloadProgress={downloadingBookId === book.id ? pdfProgress : undefined}
            />
          ))}
        </div>
      );
    }

    if (viewMode === "list") {
      return (
        <div className={styles.cardsList}>
          {booksToRender.map((book) => (
            <CardBookList
              key={book.id}
              book={book}
              onOpen={handleOpenBook}
              onDelete={handleDelete}
              isDownloading={isProcessingPdf && downloadingBookId === book.id}
              downloadProgress={downloadingBookId === book.id ? pdfProgress : undefined}
            />
          ))}
        </div>
      );
    }

    if (viewMode === "shelf") {
      return (
        <BookShelfView
          books={booksToRender}
          onOpen={handleOpenBook}
          onDelete={handleDelete}
          onMove={handleMove}
          isProcessingPdf={isProcessingPdf}
          downloadingBookId={downloadingBookId}
          pdfProgress={pdfProgress}
        />
      );
    }

    // Cualquier valor no reconocido cae en la grilla, que es la vista por
    // defecto. Devolver `null` explícito en vez de `undefined` implícito.
    return (
      <div className={styles.cards}>
        {booksToRender.map((book) => (
          <CardBook
            key={book.id}
            book={book}
            onOpen={handleOpenBook}
            onDelete={handleDelete}
            isDownloading={isProcessingPdf && downloadingBookId === book.id}
            downloadProgress={downloadingBookId === book.id ? pdfProgress : undefined}
          />
        ))}
      </div>
    );
  };

  if (isLoading) return <Loading text="Cargando libros..." />;

  return (
    <>
      {books.length > 0 ? (
        <div className={styles.toolbar}>
          {/* Search */}
          <FilterBook
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={() => setIsFilterOpen(!isFilterOpen)}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterLabels={filterLabels}
          />
        </div>
      ) : (
        <>
          <NoBooks setShowUploader={() => setShowUploader(true)} />
        </>
      )}

      <article>
        {viewMode === "shelf" ? renderBooks(shelfBooks) : renderBooks(paginatedBooks)}
      </article>

      {viewMode !== "shelf" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedBooks.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}

      {showUploader && (
        <ShowUploaderModal
          setShowUploader={handleCloseUploader}
          onAddBook={addBook}
        />
      )}
    </>
  );
};

export default Index;
