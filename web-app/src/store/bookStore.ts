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
import { deleteBookInCloud, updateBookProgress, uploadBook } from "@/api/book";
import { useUserPreferences } from "./userPreferencesStore";

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
  downloadingBookId: string;
  uploadingBookId: string | null;

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

  // Acciones de sincronización manual
  uploadBookToCloud: (bookId: string) => Promise<void>;
  downloadBookFromCloud: (bookId: string) => Promise<void>;
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
  downloadingBookId: "",
  uploadingBookId: null,

  // Cargar todos los libros (desde cache local + sincronizar con nube)
  loadBooks: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: session } = await authClient.getSession();
      if (session?.user?.id) {
        // Establecer el usuario actual en la base de datos
        setCurrentUserId(session.user.id);
      }

      // Sincronizar con la nube primero para obtener datos actualizados de otros dispositivos
      try {
        await syncBooksFromCloud();
      } catch (syncError) {
        // Si falla la sincronización, continuamos con datos locales
        console.warn("No se pudo sincronizar con la nube, usando datos locales:", syncError);
      }

      // Cargar libros después de sincronizar
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

    // Obtener preferencia del usuario
    const cloudSyncEnabled = useUserPreferences.getState().cloudSyncEnabled;

    let bookId: string;
    let isSynced = false;

    // Solo subir a la nube si está habilitado Y hay archivo
    if (file && cloudSyncEnabled) {
      try {
        const formData = new FormData();

        formData.append("pdf", file);
        formData.append("title", name);

        const id = await uploadBook(formData);

        bookId = id;
        isSynced = true;
      } catch (error) {
        console.error("Error al subir al backend:", error);
        // Si falla la subida, guardamos igual pero sin sincronizar
        bookId = generateId();
      }
    } else {
      // Sin archivo o sin sync, generar ID local
      bookId = generateId();
    }

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
      isSynced,
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

      if (!id) return

      // Obtener el libro para ver si está sincronizado
      const bookToDelete = await getBook(id);

      // SIEMPRE eliminar del cloud si el libro está sincronizado (isSynced = true)
      if (bookToDelete?.isSynced) {
        try {
          await deleteBookInCloud(id);
        } catch (error) {
          console.error("Error al eliminar del cloud:", error);
        }
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
          set({ isProcessingPdf: false, pdfProgress: 0, downloadingBookId: undefined });
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

      set((state) => {
        const book = state.books.find(b => b.id === id);
        const newTime = (book?.readingTimeSeconds || 0) + seconds;

        // Si está sincronizado, actualizar en el cloud
        if (book?.isSynced) {
          updateBookProgress(id, {
            readingTimeSeconds: newTime,
            lastReadAt: Date.now()
          }).catch(console.error);
        }

        return {
          books: state.books.map((b) =>
            b.id === id ? { ...b, readingTimeSeconds: newTime } : b,
          ),
        };
      });
    } catch (error) {
      console.error("Error updating reading time:", error);
      set({ error: "Error al actualizar tiempo de lectura" });
    }
  },

  // Establecer tiempo de lectura (valor absoluto)
  setReadingTime: async (id: string, totalSeconds: number) => {
    try {
      await setBookReadingTime(id, totalSeconds);

      set((state) => {
        const book = state.books.find(b => b.id === id);

        // Si está sincronizado, actualizar en el cloud
        if (book?.isSynced) {
          updateBookProgress(id, {
            readingTimeSeconds: totalSeconds,
            lastReadAt: Date.now()
          }).catch(console.error);
        }

        return {
          books: state.books.map((b) =>
            b.id === id ? { ...b, readingTimeSeconds: totalSeconds } : b,
          ),
        };
      });
    } catch (error) {
      console.error("Error setting reading time:", error);
      set({ error: "Error al establecer tiempo de lectura" });
    }
  },

  // Actualizar posición de scroll
  updateScrollPosition: async (id: string, position: number) => {
    try {
      await updateBookScrollPosition(id, position);

      set((state) => {
        const book = state.books.find(b => b.id === id);

        // Si está sincronizado, actualizar en el cloud
        if (book?.isSynced) {
          updateBookProgress(id, {
            scrollPosition: position,
            lastReadAt: Date.now()
          }).catch(console.error);
        }

        return {
          books: state.books.map((b) =>
            b.id === id ? { ...b, scrollPosition: position } : b,
          ),
        };
      });
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

  // Subir un libro específico a la nube manualmente
  uploadBookToCloud: async (bookId: string) => {
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user?.id) {
        throw new Error("No hay sesión activa");
      }

      setCurrentUserId(session.user.id);

      // Obtener el libro
      const book = await getBook(bookId);
      if (!book) {
        throw new Error("Libro no encontrado");
      }

      // Verificar que tiene archivo para subir
      if (!book.fileBlob && !book.fileUrl) {
        throw new Error("El libro no tiene archivo para subir");
      }

      set({ uploadingBookId: bookId });

      console.log(book)

      // Si tiene fileBlob, subirlo
      if (book.fileBlob) {
        const formData = new FormData();
        formData.append("pdf", book.fileBlob);
        formData.append("title", book.name);
        formData.append("readingTimeSeconds", book.readingTimeSeconds.toString());
        formData.append("scrollPosition", book.scrollPosition.toString());

        const cloudId = await uploadBook(formData);

        // Actualizar el libro con el ID del cloud y marcar como sincronizado
        const updatedBook: Book = {
          ...book,
          id: cloudId,
          isSynced: true,
        };

        // IMPORTANTE: Eliminar el libro viejo de local y crear uno nuevo con el ID del cloud porque el ID cambió al subirlo
        await deleteBookFromDB(book.id);
        await saveBook(updatedBook);

        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId ? updatedBook : b
          ),
          uploadingBookId: null,
        }));
      } else {
        // Si solo tiene fileUrl (vino de la nube), simplemente marcar como sincronizado
        const updatedBook: Book = {
          ...book,
          isSynced: true,
        };

        await saveBook(updatedBook);

        set((state) => ({
          books: state.books.map((b) =>
            b.id === bookId ? updatedBook : b
          ),
          uploadingBookId: null,
        }));
      }
    } catch (error) {
      console.error("Error uploading book to cloud:", error);
      set({ error: "Error al subir el libro a la nube", uploadingBookId: null });
      throw error;
    }
  },

  // Descargar un libro desde la nube manualmente
  downloadBookFromCloud: async (bookId: string) => {
    try {
      const { data: session } = await authClient.getSession();
      if (!session?.user?.id) {
        throw new Error("No hay sesión activa");
      }

      setCurrentUserId(session.user.id);

      // Obtener el libro
      const book = await getBook(bookId);
      if (!book) {
        throw new Error("Libro no encontrado");
      }

      if (!book.fileUrl) {
        throw new Error("El libro no tiene URL en la nube");
      }

      set({ downloadingBookId: bookId, isProcessingPdf: true, pdfProgress: 0 });

      // Descargar y procesar el PDF
      const processedBook = await processBookForReading(book, (progress) => {
        set({ pdfProgress: progress });
      });

      // Preservar el progreso de lectura existente
      const bookWithProgress: Book = {
        ...processedBook,
        readingTimeSeconds: book.readingTimeSeconds,
        scrollPosition: book.scrollPosition,
        lastReadAt: book.lastReadAt,
        isSynced: true, // Ya viene de la nube, así que está sincronizado
      };

      // Guardar en IndexedDB
      await saveBook(bookWithProgress);

      // Actualizar en la lista de libros
      set((state) => ({
        books: state.books.map((b) =>
          b.id === bookId ? bookWithProgress : b
        ),
        downloadingBookId: "",
        isProcessingPdf: false,
        pdfProgress: 0,
      }));
    } catch (error) {
      console.error("Error downloading book from cloud:", error);
      set({
        error: "Error al descargar el libro desde la nube",
        downloadingBookId: "",
        isProcessingPdf: false,
        pdfProgress: 0
      });
      throw error;
    }
  },
}));
