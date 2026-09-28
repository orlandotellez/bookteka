import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBookStore } from "@/store/bookStore";
import type { Book } from "@/types/book";

// ─── Mocks de dependencias ─────────────────────────────────────────────────
// Mockeamos TODOS los módulos externos que usa el store para aislar las
// pruebas de IndexedDB, sesión, API, etc.

const mockBooks: Book[] = [
  {
    id: "book-1",
    name: "El Quijote",
    text: "En un lugar de la Mancha...",
    createdAt: 1000,
    lastReadAt: 2000,
    readingTimeSeconds: 3600,
    scrollPosition: 50,
    totalPages: 500,
    isSynced: false,
  },
  {
    id: "book-2",
    name: "Cien Años de Soledad",
    text: "Muchos años después...",
    createdAt: 1500,
    lastReadAt: 2500,
    readingTimeSeconds: 1800,
    scrollPosition: 30,
    totalPages: 400,
    isSynced: true,
  },
];

vi.mock("@/database", () => ({
  getAllBooks: vi.fn(() => Promise.resolve(mockBooks)),
  getBook: vi.fn((id: string) =>
    Promise.resolve(mockBooks.find((b) => b.id === id)),
  ),
  saveBook: vi.fn(() => Promise.resolve()),
  deleteBook: vi.fn(() => Promise.resolve()),
  updateBookReadingTime: vi.fn(() => Promise.resolve()),
  setBookReadingTime: vi.fn(() => Promise.resolve()),
  updateBookScrollPosition: vi.fn(() => Promise.resolve()),
  setBookOrder: vi.fn(() => Promise.resolve()),
  updateBookPosition: vi.fn(() => Promise.resolve()),
  getBookmarksByBook: vi.fn(() => Promise.resolve([])),
  getBookmark: vi.fn(() => Promise.resolve(undefined)),
  saveBookmark: vi.fn(() => Promise.resolve()),
  updateBookmark: vi.fn(() => Promise.resolve()),
  deleteBookmark: vi.fn(() => Promise.resolve()),
  getHighlightsByBook: vi.fn(() => Promise.resolve([])),
  saveHighlight: vi.fn(() => Promise.resolve()),
  deleteHighlight: vi.fn(() => Promise.resolve()),
  setCurrentUserId: vi.fn(),
  syncBooksFromCloud: vi.fn(() => Promise.resolve()),
  syncBookmarksFromCloud: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/sessionCache", () => ({
  getCachedSession: vi.fn(() =>
    Promise.resolve({
      user: { id: "user-1", name: "Test User" },
      session: { id: "session-1" },
    }),
  ),
}));

vi.mock("@/utils/generateId", () => ({
  generateId: vi.fn(() => "mocked-id-456"),
}));

vi.mock("@/api/book", () => ({
  uploadBook: vi.fn(() => Promise.resolve("cloud-id-789")),
  deleteBookInCloud: vi.fn(() => Promise.resolve()),
  updateBookProgress: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/pdfService", () => ({
  processBookForReading: vi.fn((book: Book) =>
    Promise.resolve({ ...book, text: "Texto procesado del PDF" }),
  ),
}));

vi.mock("@/api/bookmark", () => ({
  createBookmark: vi.fn(() =>
    Promise.resolve({ id: "server-bm-1", userId: "user-1" }),
  ),
  deleteBookmark: vi.fn(() => Promise.resolve()),
  updateBookmark: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/store/userPreferencesStore", () => ({
  useUserPreferences: {
    getState: vi.fn(() => ({
      cloudSyncEnabled: false,
    })),
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

// Resetea el estado del store a sus valores iniciales antes de cada test.
// Esto evita contaminación entre tests.
const initialState = {
  books: [],
  isLoading: false,
  error: null,
  showUploader: false,
  currentView: "library" as const,
  currentBook: null,
  isSyncing: false,
  isProcessingPdf: false,
  pdfProgress: 0,
  downloadingBookId: "",
  uploadingBookId: null,
};

function resetStore() {
  useBookStore.setState(initialState);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("bookStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ─── Estado inicial ───

  describe("initial state", () => {
    it("starts with empty books list", () => {
      const { books } = useBookStore.getState();
      expect(books).toEqual([]);
    });

    it("starts with showUploader false", () => {
      const { showUploader } = useBookStore.getState();
      expect(showUploader).toBe(false);
    });

    it("starts with currentView library", () => {
      const { currentView } = useBookStore.getState();
      expect(currentView).toBe("library");
    });

    it("starts with no error", () => {
      const { error } = useBookStore.getState();
      expect(error).toBeNull();
    });
  });

  // ─── Acciones síncronas (UI) ───

  describe("setShowUploader", () => {
    it("sets showUploader to true", () => {
      useBookStore.getState().setShowUploader(true);
      expect(useBookStore.getState().showUploader).toBe(true);
    });

    it("sets showUploader to false", () => {
      useBookStore.getState().setShowUploader(true);
      useBookStore.getState().setShowUploader(false);
      expect(useBookStore.getState().showUploader).toBe(false);
    });
  });

  describe("setCurrentView", () => {
    it("changes current view", () => {
      useBookStore.getState().setCurrentView("reader");
      expect(useBookStore.getState().currentView).toBe("reader");
      useBookStore.getState().setCurrentView("profile");
      expect(useBookStore.getState().currentView).toBe("profile");
    });
  });

  describe("setCurrentBook", () => {
    it("sets the current book", () => {
      const book = mockBooks[0];
      useBookStore.getState().setCurrentBook(book);
      expect(useBookStore.getState().currentBook).toEqual(book);
    });

    it("clears the current book with null", () => {
      useBookStore.getState().setCurrentBook(mockBooks[0]);
      useBookStore.getState().setCurrentBook(null);
      expect(useBookStore.getState().currentBook).toBeNull();
    });
  });

  // ─── Acciones asíncronas ───

  describe("loadBooks", () => {
    it("loads books and updates state", async () => {
      await useBookStore.getState().loadBooks();

      const { books, isLoading } = useBookStore.getState();
      expect(books).toHaveLength(2);
      expect(books[0].name).toBe("El Quijote");
      expect(isLoading).toBe(false);
    });

    it("sets error when load fails", async () => {
      // Hacer que getAllBooks falle
      const { getAllBooks } = await import("@/database");
      vi.mocked(getAllBooks).mockRejectedValueOnce(new Error("DB error"));

      await useBookStore.getState().loadBooks();

      const { error, isLoading } = useBookStore.getState();
      expect(error).toBe("Error al cargar los libros");
      expect(isLoading).toBe(false);
    });
  });

  describe("addBook", () => {
    it("adds a new book to the store", async () => {
      const newBook = await useBookStore
        .getState()
        .addBook("Nuevo Libro", "Contenido del libro...");

      expect(newBook.name).toBe("Nuevo Libro");
      expect(newBook.text).toBe("Contenido del libro...");

      // Debería estar al inicio de la lista
      const { books } = useBookStore.getState();
      expect(books[0].name).toBe("Nuevo Libro");
    });

    it("throws error when there is no session", async () => {
      // Hacer que getCachedSession devuelva null
      const { getCachedSession } = await import("@/lib/sessionCache");
      vi.mocked(getCachedSession).mockResolvedValueOnce(null);

      await expect(
        useBookStore.getState().addBook("Test", "texto"),
      ).rejects.toThrow("No hay sesión activa");
    });
  });

  describe("deleteBook", () => {
    it("removes a book from the store", async () => {
      // Primero cargar libros
      await useBookStore.getState().loadBooks();
      expect(useBookStore.getState().books).toHaveLength(2);

      // Eliminar uno
      await useBookStore.getState().deleteBook("book-1");

      const { books } = useBookStore.getState();
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe("book-2");
    });

    it("throws error when there is no session", async () => {
      const { getCachedSession } = await import("@/lib/sessionCache");
      vi.mocked(getCachedSession).mockResolvedValueOnce(null);

      await expect(
        useBookStore.getState().deleteBook("book-1"),
      ).rejects.toThrow("No hay sesión activa");
    });
  });

  describe("updateReadingTime", () => {
    it("increments reading time", async () => {
      // Cargar libros primero
      await useBookStore.getState().loadBooks();
      const initialTime = useBookStore.getState().books[0].readingTimeSeconds;

      await useBookStore.getState().updateReadingTime("book-1", 60);

      const updatedBook = useBookStore.getState().books.find(
        (b) => b.id === "book-1",
      );
      expect(updatedBook?.readingTimeSeconds).toBe(initialTime + 60);
    });
  });

  describe("updateScrollPosition", () => {
    it("updates scroll position", async () => {
      await useBookStore.getState().loadBooks();

      await useBookStore.getState().updateScrollPosition("book-1", 100);

      const updatedBook = useBookStore.getState().books.find(
        (b) => b.id === "book-1",
      );
      expect(updatedBook?.scrollPosition).toBe(100);
    });
  });

  describe("getBookById", () => {
    it("returns a book by id", async () => {
      const book = await useBookStore.getState().getBookById("book-1");
      expect(book).not.toBeNull();
      expect(book?.name).toBe("El Quijote");
    });

    it("returns null for non-existent book", async () => {
      const book = await useBookStore.getState().getBookById("non-existent");
      expect(book).toBeNull();
    });
  });

  describe("moveBook", () => {
    it("normalizes positions and moves a book after its neighbor", async () => {
      await useBookStore.getState().loadBooks();
      // Estado inicial: [book-1, book-2] sin position

      // Mover book-1 después de book-2 (beforeId = book-2)
      await useBookStore.getState().moveBook("book-1", "book-2", null);

      const { books } = useBookStore.getState();
      expect(books[0].id).toBe("book-2");
      expect(books[1].id).toBe("book-1");

      // La primera ordenación manual fija posiciones iniciales
      const { setBookOrder, updateBookPosition } = await import("@/database");
      expect(setBookOrder).toHaveBeenCalled();
      expect(updateBookPosition).toHaveBeenCalledWith("book-1", expect.any(Number));
    });
  });
});

// ─── loadBookmarks: sincronización con el cloud ────────────────────────────
describe("loadBookmarks", () => {
  beforeEach(async () => {
    useBookStore.setState({ books: [] });
    const { getBookmarksByBook, syncBookmarksFromCloud } = await import(
      "@/database"
    );
    vi.mocked(getBookmarksByBook).mockResolvedValue([]);
    vi.mocked(syncBookmarksFromCloud).mockResolvedValue([]);
  });

  it("no llama al cloud si el libro no está sincronizado", async () => {
    useBookStore.setState({
      books: [{ ...mockBooks[0], isSynced: false }],
    });

    const { syncBookmarksFromCloud } = await import("@/database");
    await useBookStore.getState().loadBookmarks("book-1");

    expect(syncBookmarksFromCloud).not.toHaveBeenCalled();
  });

  it("sincroniza con el cloud si el libro está sincronizado", async () => {
    useBookStore.setState({
      books: [{ ...mockBooks[1], isSynced: true }],
    });

    const { getBookmarksByBook, syncBookmarksFromCloud } = await import(
      "@/database"
    );
    vi.mocked(getBookmarksByBook).mockResolvedValue([
      {
        id: "bm-local",
        bookId: "book-2",
        name: "Local",
        pageNumber: 1,
        textPreview: "",
        color: "yellow",
        createdAt: 1000,
      },
    ]);
    vi.mocked(syncBookmarksFromCloud).mockResolvedValue([
      {
        id: "bm-cloud",
        bookId: "book-2",
        name: "Del cloud",
        pageNumber: 2,
        textPreview: "",
        color: "green",
        createdAt: 2000,
      },
    ]);

    const result = await useBookStore.getState().loadBookmarks("book-2");

    expect(syncBookmarksFromCloud).toHaveBeenCalledWith("book-2", [
      expect.objectContaining({ id: "bm-local" }),
    ]);
    expect(result[0].id).toBe("bm-cloud");
  });

  it("devuelve los marcadores locales si el cloud falla", async () => {
    useBookStore.setState({
      books: [{ ...mockBooks[1], isSynced: true }],
    });

    const { getBookmarksByBook, syncBookmarksFromCloud } = await import(
      "@/database"
    );
    const local = [
      {
        id: "bm-local",
        bookId: "book-2",
        name: "Local",
        pageNumber: 1,
        textPreview: "",
        color: "yellow" as const,
        createdAt: 1000,
      },
    ];
    vi.mocked(getBookmarksByBook).mockResolvedValue(local);
    vi.mocked(syncBookmarksFromCloud).mockRejectedValue(new Error("offline"));

    const result = await useBookStore.getState().loadBookmarks("book-2");

    // La documentación del store dice que el modo offline manda: un fallo de
    // red no puede descartar lo que ya está en el dispositivo.
    expect(result).toEqual(local);
  });
});
