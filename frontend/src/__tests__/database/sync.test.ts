import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Book } from "@/types/book";

const stored: Array<Record<string, unknown>> = [];

vi.mock("@/database/connection", () => ({
  getCurrentUserId: vi.fn(() => "user-1"),
  getDatabase: () =>
    Promise.resolve({
      get: vi.fn(async (_store: string, id: string) =>
        stored.find((b) => b.id === id),
      ),
      put: vi.fn(async (_store: string, value: Record<string, unknown>) => {
        stored.push(value);
      }),
    }),
}));

const listMock = vi.fn();
vi.mock("@/api/book", () => ({
  booksApi: { list: () => listMock() },
}));

const { syncBooksFromCloud } = await import("@/database/sync");

function cloudBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    name: "Libro",
    readingTimeSeconds: 100,
    scrollPosition: 100,
    currentPage: 1,
    lastReadAt: 1000,
    text: "",
    createdAt: 500,
    fileUrl: null as unknown as string | undefined,
    fileKey: null as unknown as string | undefined,
    isSynced: true,
    ...overrides,
  };
}

beforeEach(() => {
  stored.length = 0;
  listMock.mockReset();
});

describe("syncBooksFromCloud — invariante: el progreso nunca retrocede", () => {
  it("gana el local cuando tiene más tiempo de lectura", async () => {
    stored.push({
      id: "book-1",
      readingTimeSeconds: 5000,
      scrollPosition: 1,
      currentPage: 1,
      lastReadAt: 1000,
      text: "texto local",
      fileBlob: new Blob(["pdf"]),
      position: 3,
    });
    listMock.mockResolvedValue([cloudBook({ readingTimeSeconds: 200 })]);

    await syncBooksFromCloud();

    const merged = stored[stored.length - 1];
    expect(merged.readingTimeSeconds).toBe(5000);
  });

  it("gana la nube cuando tiene más scroll", async () => {
    stored.push({
      id: "book-1",
      readingTimeSeconds: 0,
      scrollPosition: 10,
      currentPage: 0,
      lastReadAt: 0,
    });
    listMock.mockResolvedValue([cloudBook({ scrollPosition: 9000 })]);

    await syncBooksFromCloud();

    const merged = stored[stored.length - 1];
    expect(merged.scrollPosition).toBe(9000);
  });

  it("el merge toma el mayor de cada campo, no el del que llegó último", async () => {
    stored.push({
      id: "book-1",
      readingTimeSeconds: 900,
      scrollPosition: 10,
      currentPage: 40,
      lastReadAt: 500,
    });
    listMock.mockResolvedValue([
      cloudBook({
        readingTimeSeconds: 100,
        scrollPosition: 9999,
        currentPage: 2,
        lastReadAt: 999999,
      }),
    ]);

    await syncBooksFromCloud();

    const merged = stored[stored.length - 1];
    expect(merged.readingTimeSeconds).toBe(900);
    expect(merged.scrollPosition).toBe(9999);
    expect(merged.currentPage).toBe(40);
    expect(merged.lastReadAt).toBe(999999);
  });

  it("text, fileBlob y position locales sobreviven al merge", async () => {
    stored.push({
      id: "book-1",
      readingTimeSeconds: 0,
      scrollPosition: 0,
      currentPage: 0,
      lastReadAt: 0,
      text: "texto extraído",
      fileBlob: new Blob(["pdf"]),
      position: 7,
    });
    listMock.mockResolvedValue([cloudBook()]);

    await syncBooksFromCloud();

    const merged = stored[stored.length - 1];
    expect(merged.text).toBe("texto extraído");
    expect(merged.fileBlob).toBeInstanceOf(Blob);
    expect(merged.position).toBe(7);
  });

  it("convierte fileUrl/fileKey null de la nube a undefined", async () => {
    listMock.mockResolvedValue([cloudBook()]);

    await syncBooksFromCloud();

    const merged = stored[stored.length - 1];
    expect(merged.fileUrl).toBeUndefined();
    expect(merged.fileKey).toBeUndefined();
  });

  it("marca isSynced true y asigna el userId de la sesión", async () => {
    listMock.mockResolvedValue([cloudBook()]);

    await syncBooksFromCloud();

    const merged = stored[stored.length - 1];
    expect(merged.isSynced).toBe(true);
    expect(merged.userId).toBe("user-1");
  });

  it("lanza si no hay usuario autenticado", async () => {
    const { getCurrentUserId } = await import("@/database/connection");
    vi.mocked(getCurrentUserId).mockReturnValueOnce(null);
    listMock.mockResolvedValue([cloudBook()]);

    await expect(syncBooksFromCloud()).rejects.toThrow(
      "No hay usuario autenticado",
    );
    expect(listMock).not.toHaveBeenCalled();
  });
});