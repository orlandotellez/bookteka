import type { Book, Bookmark, Highlight } from "@/types/book";
import { create } from "zustand";
import {
  getAllBooks,
  getBook,
  saveBook,
  deleteBook as deleteBookFromDB,
  updateBookReadingTime,
  updateBookScrollPosition,
  setBookReadingTime,
  getBookmarksByBook,
  saveBookmark,
  deleteBookmark as deleteBookmarkFromDB,
  getHighlightsByBook,
  saveHighlight,
  deleteHighlight as deleteHighlightFromDB,
  setCurrentUserId,
  syncBooksFromCloud,
} from "@/lib/database";
import { generateId } from "@/utils/generateId";
import { authClient } from "@/lib/auth-client";
import { processBookForReading } from "@/lib/pdfService";
import { uploadBook } from "@/api/book";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type View = "library" | "reader" | "profile";

interface BookStore {
  // Estado
  books: Book[];
  isLoading: boolean;
  error: string | null;
  showUploader: boolean;
  currentView: View;
  currentBook: Book | null;
  isSyncing: boolean;
  isProcessingPdf: boolean;
  pdfProgress: number;
  downloadingBookId: string | null;

  // Acciones CRUD
  addBook: (name: string, text: string, totalPages?: number, file?: File) => Promise<Book>;
  deleteBook: (id: string) => Promise<void>;
  getBookById: (id: string) => Promise<Book | null>;
  loadBooks: () => Promise<void>;
  syncBooks: () => Promise<void>;

  // Acciones de lectura
  updateReadingTime: (id: string, seconds: number) => Promise<void>;
  setReadingTime: (id: string, totalSeconds: number) => Promise<void>;
  updateScrollPosition: (id: string, position: number) => Promise<void>;

  // Acciones de UI
  setShowUploader: (show: boolean) => void;
  setCurrentView: (view: View) => void;
  setCurrentBook: (book: Book | null) => void;

  // Acciones de bookmarks
  loadBookmarks: (bookId: string) => Promise<Bookmark[]>;
  addBookmark: (bookmark: Bookmark) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;

  // Acciones de highlights
  loadHighlights: (bookId: string) => Promise<Highlight[]>;
  addHighlight: (highlight: Highlight) => Promise<void>;
  removeHighlight: (id: string) => Promise<void>;
}

export const useBookStore = create<BookStore>((set) => ({
  // Estado inicial
  books: [],
  isLoading: false,
  error: null,
  showUploader: false,
  currentView: "library",
  currentBook: null,
  isSyncing: false,
  isProcessingPdf: false,
  pdfProgress: 0,
  downloadingBookId: null,

  // Cargar todos los libros (desde cache local)
  loadBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user?.id) {
        // Establecer el usuario actual en la base de datos
        setCurrentUserId(session.user.id);
      }

      const loadedBooks = await getAllBooks();
      set({ books: loadedBooks, isLoading: false });
    } catch (error) {
      console.error("Error loading books:", error);
      set({ error: "Error al cargar los libros", isLoading: false });
    }
  },

  // Sincronizar libros desde la nube
  syncBooks: async () => {
    set({ isSyncing: true, error: null });
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user?.id) {
        throw new Error("No hay sesión activa");
      }

      // Establecer el usuario actual en la base de datos
      setCurrentUserId(session.user.id);

      // Sincronizar desde la nube
      await syncBooksFromCloud();

      // Recargar libros locales después de sincronizar
      const loadedBooks = await getAllBooks();
      set({ books: loadedBooks, isSyncing: false });
    } catch (error) {
      console.error("Error syncing books:", error);
      set({ error: "Error al sincronizar libros", isSyncing: false });
    }
  },

  // Añadir un libro nuevo
  addBook: async (
    name: string,
    text: string,
    totalPages?: number,
    file?: File,
  ): Promise<Book> => {
    // Verificar que hay sesión activa y establecer el usuario actual
    const { data: session } = await authClient.getSession();
    if (!session?.user?.id) {
      throw new Error("No hay sesión activa");
    }
    setCurrentUserId(session.user.id);

    let bookId: string;
    let cloudBookId: string | undefined;

    if (file) {
      try {
        const formData = new FormData();

        formData.append("pdf", file);
        formData.append("title", name);

        const id = await uploadBook(formData)

        cloudBookId = id;
      } catch (error) {
        console.error("Error al subir al backend:", error);
      }
    }

    bookId = cloudBookId || generateId();

    const newBook: Book = {
      id: bookId,
      name,
      text,
      createdAt: Date.now(),
      lastReadAt: Date.now(),
      readingTimeSeconds: 0,
      scrollPosition: 0,
      totalPages,
      fileBlob: file,
    };

    try {
      await saveBook(newBook);
      set((state) => ({ books: [newBook, ...state.books] }));
      return newBook;
    } catch (error) {
      console.error("Error adding book:", error);
      set({ error: "Error al añadir el libro" });
      throw error;
    }
  },

  // Eliminar un libro
  deleteBook: async (id: string) => {
    try {
      const { data: session } = await authClient.getSession();

      if (!session) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al eliminar el libro del servidor");
      }

      // Eliminar de la base de datos local (IndexedDB)
      await deleteBookFromDB(id);

      set((state) => ({
        books: state.books.filter((book) => book.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting book:", error);
      set({ error: "Error al eliminar el libro" });
      throw error;
    }
  },

  // Obtener un libro por ID
  getBookById: async (id: string): Promise<Book | null> => {
    try {
      let book = await getBook(id);

      if (!book) return null;

      // Verificar si necesita descargar el PDF
      const needsDownload = book.fileUrl && (!book.text || book.text.length < 10);

      if (needsDownload) {
        set({ isProcessingPdf: true, pdfProgress: 0, downloadingBookId: id });

        try {
          // Descargar y procesar el PDF
          const processedBook = await processBookForReading(book, (progress) => {
            set({ pdfProgress: progress });
          });

          // IMPORTANTE: Preservar el progreso de lectura existente al procesar el PDF
          const bookWithProgress: Book = {
            ...processedBook,
            readingTimeSeconds: book.readingTimeSeconds,
            scrollPosition: book.scrollPosition,
            lastReadAt: book.lastReadAt,
          };

          // Guardar el libro actualizado en IndexedDB
          await saveBook(bookWithProgress);

          // Actualizar en la lista de libros
          set((state) => ({
            books: state.books.map((b) =>
              b.id === id ? bookWithProgress : b
            ),
            // También actualizar currentBook si es el mismo libro
            currentBook: state.currentBook?.id === id ? bookWithProgress : state.currentBook,
          }));

          book = bookWithProgress;
        } catch (pdfError) {
          console.error("Error downloading PDF:", pdfError);
          set({ error: "Error al procesar el PDF" });
        } finally {
          set({ isProcessingPdf: false, pdfProgress: 0, downloadingBookId: null });
        }
      }

      return book;
    } catch (error) {
      console.error("Error getting book:", error);
      set({ error: "Error al obtener el libro" });
      return null;
    }
  },

  // Actualizar tiempo de lectura (incrementar)
  updateReadingTime: async (id: string, seconds: number) => {
    try {
      await updateBookReadingTime(id, seconds);
      set((state) => ({
        books: state.books.map((book) =>
          book.id === id
            ? { ...book, readingTimeSeconds: book.readingTimeSeconds + seconds }
            : book,
        ),
      }));
    } catch (error) {
      console.error("Error updating reading time:", error);
      set({ error: "Error al actualizar tiempo de lectura" });
    }
  },

  // Establecer tiempo de lectura (valor absoluto)
  setReadingTime: async (id: string, totalSeconds: number) => {
    try {
      await setBookReadingTime(id, totalSeconds);
      set((state) => ({
        books: state.books.map((book) =>
          book.id === id ? { ...book, readingTimeSeconds: totalSeconds } : book,
        ),
      }));
    } catch (error) {
      console.error("Error setting reading time:", error);
      set({ error: "Error al establecer tiempo de lectura" });
    }
  },

  // Actualizar posición de scroll
  updateScrollPosition: async (id: string, position: number) => {
    try {
      await updateBookScrollPosition(id, position);
      set((state) => ({
        books: state.books.map((book) =>
          book.id === id ? { ...book, scrollPosition: position } : book,
        ),
      }));
    } catch (error) {
      console.error("Error updating scroll position:", error);
      set({ error: "Error al actualizar posición de scroll" });
    }
  },

  // Acciones de UI
  setShowUploader: (show: boolean) => set({ showUploader: show }),
  setCurrentView: (view: View) => set({ currentView: view }),
  setCurrentBook: (book: Book | null) => set({ currentBook: book }),

  // Cargar bookmarks de un libro
  loadBookmarks: async (bookId: string) => {
    try {
      return await getBookmarksByBook(bookId);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      return [];
    }
  },

  // Agregar bookmark
  addBookmark: async (bookmark: Bookmark) => {
    try {
      await saveBookmark(bookmark);
    } catch (error) {
      console.error("Error adding bookmark:", error);
      set({ error: "Error al añadir marcador" });
      throw error;
    }
  },

  // Eliminar bookmark
  removeBookmark: async (id: string) => {
    try {
      await deleteBookmarkFromDB(id);
    } catch (error) {
      console.error("Error removing bookmark:", error);
      set({ error: "Error al eliminar marcador" });
      throw error;
    }
  },

  // Cargar highlights de un libro
  loadHighlights: async (bookId: string) => {
    try {
      return await getHighlightsByBook(bookId);
    } catch (error) {
      console.error("Error loading highlights:", error);
      return [];
    }
  },

  // Agregar highlight
  addHighlight: async (highlight: Highlight) => {
    try {
      await saveHighlight(highlight);
    } catch (error) {
      console.error("Error adding highlight:", error);
      set({ error: "Error al añadir resaltado" });
      throw error;
    }
  },

  // Eliminar highlight
  removeHighlight: async (id: string) => {
    try {
      await deleteHighlightFromDB(id);
    } catch (error) {
      console.error("Error removing highlight:", error);
      set({ error: "Error al eliminar resaltado" });
      throw error;
    }
  },
}));
