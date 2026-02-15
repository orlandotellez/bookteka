import type { Book } from "@/types/book";
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { CardBook } from "./CardBook";
import { useBookStore } from "@/store/bookStore";
import styles from "./Library.module.css";

type SortBy = "recent" | "name" | "time";
type FilterStatus = "all" | "reading" | "unstarted";

export const Library = () => {
  const [searchQuery] = useState("");
  const [filterStatus] = useState<FilterStatus>("all");
  const [sortBy] = useState<SortBy>("recent");

  const {
    books,
    isLoading,
    deleteBook,
    getBookById,
    setCurrentBook,
    setCurrentView,
    loadBooks,
  } = useBookStore();

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

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
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((b) => b.name.toLowerCase().includes(q));
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
    console.log(booksToRender);
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
  };

  if (isLoading) return "cargando....";

  return (
    <>
      <article>{renderBooks(processedBooks)}</article>
    </>
  );
};
