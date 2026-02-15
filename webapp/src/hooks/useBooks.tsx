import { useState, useEffect, useCallback } from "react";
import type { Book } from "@/types/book";
import {
  getAllBooks,
  getBook,
  saveBook,
  deleteBook as deleteBookFromDB,
  updateBookReadingTime,
  updateBookScrollPosition,
  setBookReadingTime,
} from "@/lib/database";

/**
 * Hook para gestionar la biblioteca de libros
 */
export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar libros al montar
  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedBooks = await getAllBooks();
      setBooks(loadedBooks);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Añadir un libro nuevo
  const addBook = useCallback(
    async (name: string, text: string, totalPages?: number): Promise<Book> => {
      const newBook: Book = {
        id: crypto.randomUUID(),
        name,
        text,
        createdAt: Date.now(),
        lastReadAt: Date.now(),
        readingTimeSeconds: 0,
        scrollPosition: 0,
        totalPages,
      };

      await saveBook(newBook);
      setBooks((prev) => [newBook, ...prev]);
      return newBook;
    },
    [],
  );

  // Eliminar un libro
  const deleteBook = useCallback(async (id: string) => {
    await deleteBookFromDB(id);
    setBooks((prev) => prev.filter((book) => book.id !== id));
  }, []);

  // Obtener un libro por ID
  const getBookById = useCallback(
    async (id: string): Promise<Book | undefined> => {
      return getBook(id);
    },
    [],
  );

  // Actualizar tiempo de lectura (incrementar)
  const updateReadingTime = useCallback(async (id: string, seconds: number) => {
    await updateBookReadingTime(id, seconds);
    setBooks((prev) =>
      prev.map((book) =>
        book.id === id
          ? { ...book, readingTimeSeconds: book.readingTimeSeconds + seconds }
          : book,
      ),
    );
  }, []);

  // Establecer tiempo de lectura (valor absoluto)
  const setReadingTime = useCallback(
    async (id: string, totalSeconds: number) => {
      await setBookReadingTime(id, totalSeconds);
      setBooks((prev) =>
        prev.map((book) =>
          book.id === id ? { ...book, readingTimeSeconds: totalSeconds } : book,
        ),
      );
    },
    [],
  );

  // Actualizar posición de scroll
  const updateScrollPosition = useCallback(
    async (id: string, position: number) => {
      await updateBookScrollPosition(id, position);
      setBooks((prev) =>
        prev.map((book) =>
          book.id === id ? { ...book, scrollPosition: position } : book,
        ),
      );
    },
    [],
  );

  return {
    books,
    isLoading,
    addBook,
    deleteBook,
    getBookById,
    updateReadingTime,
    setReadingTime,
    updateScrollPosition,
    refreshBooks: loadBooks,
  };
}
