import type { Book } from "@/types/book";
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { CardBook } from "./CardBook";
import { useBookStore } from "@/store/bookStore";
import styles from "./Library.module.css";
import {
  Book as BookIcon,
  ChevronDown,
  Grid,
  Menu,
  Search,
  Plus,
} from "lucide-react";
import { CardBookList } from "./CardBookList";
import { normalizeText } from "@/utils/text";
import { ShowUploaderModal } from "../modals/ShowUploaderModal";

type SortBy = "recent" | "name" | "time";
type FilterStatus = "all" | "reading" | "unstarted";

export const Library = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "shelf">("grid");

  const {
    books,
    isLoading,
    deleteBook,
    getBookById,
    setCurrentBook,
    setCurrentView,
    loadBooks,
    showUploader,
    setShowUploader,
    addBook,
  } = useBookStore();

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-filter")) setIsFilterOpen(false);
      if (!target.closest(".dropdown-sort")) setIsSortOpen(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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

  const processedBooks = useMemo(() => {
    let filtered = [...books];

    // Search
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      filtered = filtered.filter((b) => normalizeText(b.name).includes(q));
    }

    // Filter
    if (filterStatus === "reading") {
      filtered = filtered.filter((b) => b.scrollPosition > 0);
    } else if (filterStatus === "unstarted") {
      filtered = filtered.filter((b) => b.scrollPosition === 0);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "recent") return b.lastReadAt - a.lastReadAt;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "time") return b.readingTimeSeconds - a.readingTimeSeconds;
      return 0;
    });

    return filtered;
  }, [books, searchQuery, filterStatus, sortBy]);

  const filterLabels: Record<FilterStatus, string> = {
    all: "Todos",
    reading: "Leyendo",
    unstarted: "sin empezar",
  };

  const sortLabels: Record<SortBy, string> = {
    recent: "Recientes",
    name: "Nombre",
    time: "Tiempo",
  };

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
    if (viewMode === "grid") {
      return (
        <div className={styles.cards}>
          {booksToRender.map((book) => (
            <CardBook
              key={book.id}
              book={book}
              onOpen={handleOpenBook}
              onDelete={handleDelete}
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
            />
          ))}
        </div>
      );
    }
  };

  if (isLoading) return "cargando....";

  return (
    <>
      {books.length > 0 ? (
        <div className={styles.toolbar}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <div className={styles.searchIcon}>
              <Search width={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar libros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={`dropdown-filter ${styles.dropdown}`}>
            <button
              className={styles.dropdownTrigger}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              aria-expanded={isFilterOpen}
            >
              {filterLabels[filterStatus]}

              <ChevronDown width={16} />
            </button>
            <div
              className={`${styles.dropdownContent} ${isFilterOpen ? styles.open : ""
                }`}
            >
              {(Object.keys(filterLabels) as FilterStatus[]).map((key) => (
                <button
                  key={key}
                  className={styles.dropdownItem}
                  onClick={() => {
                    setFilterStatus(key);
                    setIsFilterOpen(false);
                  }}
                >
                  {filterLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className={`dropdown-sort ${styles.dropdown}`}>
            <button
              className={styles.dropdownTrigger}
              onClick={() => setIsSortOpen(!isSortOpen)}
              aria-expanded={isSortOpen}
            >
              {sortLabels[sortBy]}

              <ChevronDown width={16} />
            </button>
            <div
              className={`${styles.dropdownContent} ${isSortOpen ? styles.open : ""
                }`}
            >
              {(Object.keys(sortLabels) as SortBy[]).map((key) => (
                <button
                  key={key}
                  className={styles.dropdownItem}
                  onClick={() => {
                    setSortBy(key);
                    setIsSortOpen(false);
                  }}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${styles.viewButtonFirst} ${viewMode === "grid" ? styles.active : ""
                }`}
              onClick={() => setViewMode("grid")}
              aria-label="Vista grid"
            >
              <Grid width={16} />
            </button>
            <button
              className={`${styles.viewButton} ${styles.viewButtonMiddle} ${viewMode === "list" ? styles.active : ""
                }`}
              onClick={() => setViewMode("list")}
              aria-label="Vista lista"
            >
              <Menu width={16} />
            </button>
            <button
              className={`${styles.viewButton} ${styles.viewButtonLast} ${viewMode === "shelf" ? styles.active : ""
                }`}
              onClick={() => setViewMode("shelf")}
              aria-label="Vista estante"
            >
              <BookIcon width={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <BookIcon width={64} height={64} color="var(--font-color-text)" />
            </div>
            <h2 className={styles.emptyTitle}>Tu biblioteca está vacía</h2>
            <p className={styles.emptyText}>
              Sube tu primer libro para comenzar a leer
            </p>
            <button
              className={styles.emptyButton}
              onClick={() => setShowUploader(true)}
            >
              <Plus width={20} height={20} />
              Añadir tu primer libro
            </button>
          </div>
        </>
      )}
      <article>{renderBooks(processedBooks)}</article>

      {showUploader && (
        <ShowUploaderModal
          setShowUploader={() => setShowUploader(false)}
          onAddBook={addBook}
        />
      )}
    </>
  );
};
