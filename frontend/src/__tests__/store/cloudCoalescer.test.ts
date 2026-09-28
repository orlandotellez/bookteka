import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useBookStore } from "@/store/bookStore";
import {
  flushPendingCloudProgress,
  deleteCloudCoalescer,
} from "@/store/bookStore";

vi.mock("@/api/book", () => ({
  updateBookProgress: vi.fn(async () => ({ success: true })),
  uploadBook: vi.fn(async () => ({ bookId: "book-1", userBookId: "ub1" })),
  deleteBookInCloud: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/database", () => ({
  getAllBooks: vi.fn(async () => []),
  getBook: vi.fn(async () => undefined),
  saveBook: vi.fn(async () => undefined),
  deleteBook: vi.fn(async () => undefined),
  updateBookReadingTime: vi.fn(async () => undefined),
  setBookReadingTime: vi.fn(async () => undefined),
  updateBookScrollPosition: vi.fn(async () => undefined),
  updateBookCurrentPage: vi.fn(async () => undefined),
  setBookOrder: vi.fn(async () => undefined),
  updateBookPosition: vi.fn(async () => undefined),
  getBookmarksByBook: vi.fn(async () => []),
  getBookmark: vi.fn(async () => undefined),
  saveBookmark: vi.fn(async () => undefined),
  updateBookmark: vi.fn(async () => undefined),
  deleteBookmark: vi.fn(async () => undefined),
  getHighlightsByBook: vi.fn(async () => []),
  saveHighlight: vi.fn(async () => undefined),
  deleteHighlight: vi.fn(async () => undefined),
  setCurrentUserId: vi.fn(),
  syncBooksFromCloud: vi.fn(async () => []),
  syncBookmarksFromCloud: vi.fn(async () => []),
}));

vi.mock("@/lib/sessionCache", () => ({
  getCachedSession: vi.fn(async () => ({ user: { id: "user-1" } })),
}));

vi.mock("@/lib/pdf", () => ({
  processBookForReading: vi.fn(async (book: unknown) => book),
}));

const { updateBookProgress } = await import("@/api/book");

function seededBook(isSynced: boolean) {
  useBookStore.setState({
    books: [
      {
        id: "book-1",
        name: "Libro",
        readingTimeSeconds: 0,
        scrollPosition: 0,
        currentPage: 0,
        lastReadAt: 0,
        text: "",
        createdAt: 0,
        isSynced,
      },
    ],
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(updateBookProgress).mockClear();
  useBookStore.setState({ books: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("coalescer de progreso", () => {
  it("dos actualizaciones dentro de 3s producen un solo PATCH con los campos mezclados", async () => {
    seededBook(true);

    await useBookStore.getState().updateReadingTime("book-1", 30);
    await useBookStore.getState().updateReadingTime("book-1", 15);

    expect(updateBookProgress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(updateBookProgress).toHaveBeenCalledTimes(1);
    expect(updateBookProgress).toHaveBeenCalledWith(
      "book-1",
      expect.objectContaining({ readingTimeSeconds: 45 }),
      expect.any(Object),
    );
  });

  it("mezcla scroll, página y tiempo en el mismo PATCH", async () => {
    seededBook(true);

    await useBookStore.getState().updateScrollPosition("book-1", 400);
    await useBookStore.getState().updateCurrentPage("book-1", 12);
    await useBookStore.getState().updateReadingTime("book-1", 60);

    await useBookStore.getState().flush;
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(updateBookProgress).toHaveBeenCalledTimes(1);
    expect(updateBookProgress).toHaveBeenCalledWith(
      "book-1",
      expect.objectContaining({
        scrollPosition: 400,
        currentPage: 12,
        readingTimeSeconds: 60,
      }),
      expect.any(Object),
    );
  });

  it("flushPendingCloudProgress(bookId) fuerza el envío y vacía la cola", async () => {
    seededBook(true);

    await useBookStore.getState().updateScrollPosition("book-1", 100);
    flushPendingCloudProgress("book-1");

    expect(updateBookProgress).toHaveBeenCalledTimes(1);
    expect(updateBookProgress).toHaveBeenCalledWith(
      "book-1",
      expect.objectContaining({ scrollPosition: 100 }),
      expect.any(Object),
    );

    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    expect(updateBookProgress).toHaveBeenCalledTimes(1);
  });

  it("flushPendingCloudProgress() sin argumentos flushea todas las colas", async () => {
    useBookStore.setState({
      books: [
        { id: "a", name: "A", readingTimeSeconds: 0, scrollPosition: 0, currentPage: 0, lastReadAt: 0, text: "", createdAt: 0, isSynced: true },
        { id: "b", name: "B", readingTimeSeconds: 0, scrollPosition: 0, currentPage: 0, lastReadAt: 0, text: "", createdAt: 0, isSynced: true },
      ],
    });

    await useBookStore.getState().updateScrollPosition("a", 1);
    await useBookStore.getState().updateScrollPosition("b", 2);
    flushPendingCloudProgress();

    expect(updateBookProgress).toHaveBeenCalledTimes(2);
  });

  it("deleteCloudCoalescer elimina la entrada pendiente del Map", async () => {
    seededBook(true);

    await useBookStore.getState().updateScrollPosition("book-1", 50);
    deleteCloudCoalescer("book-1");

    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(updateBookProgress).not.toHaveBeenCalled();

    await useBookStore.getState().updateScrollPosition("book-1", 60);
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();

    expect(updateBookProgress).toHaveBeenCalledTimes(1);
  });

  it("un libro no sincronizado no dispara PATCH", async () => {
    seededBook(false);

    await useBookStore.getState().updateReadingTime("book-1", 30);
    flushPendingCloudProgress("book-1");

    expect(updateBookProgress).not.toHaveBeenCalled();
  });
});