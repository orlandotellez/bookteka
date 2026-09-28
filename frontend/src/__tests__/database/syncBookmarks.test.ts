import { describe, it, expect, beforeEach, vi } from "vitest";
import { syncBookmarksFromCloud } from "@/database/syncBookmarks";
import type { Bookmark } from "@/types/book";

// ─── Mocks ────────────────────────────────────────────────────────────────
// Aislamos la capa de datos: el merge es lógica pura, no queremos tocar
// IndexedDB ni la red en estas pruebas.

const saved: Bookmark[] = [];

vi.mock("@/database/connection", () => ({
  getDatabase: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => Promise.resolve(undefined)),
      put: vi.fn((_store: string, value: Bookmark) => {
        saved.push(value);
        return Promise.resolve();
      }),
    }),
  ),
  getCurrentUserId: vi.fn(() => "user-1"),
}));

const listMock = vi.fn();
vi.mock("@/api/bookmark", () => ({
  bookmarksApi: {
    list: (bookId: string) => listMock(bookId),
  },
}));

// Los locales se leen de IndexedDB cuando el caller no los pasa.
const getBookmarksByBookMock = vi.fn((_bookId: string) =>
  Promise.resolve([] as Bookmark[]),
);
vi.mock("@/database/features/bookmarks", () => ({
  getBookmarksByBook: (bookId: string) => getBookmarksByBookMock(bookId),
}));

const LOCAL_ONLY: Bookmark = {
  id: "local-1",
  bookId: "book-1",
  name: "Marcado sin conexión",
  pageNumber: 10,
  textPreview: "creado offline",
  color: "yellow",
  createdAt: 1000,
};

const SHARED_LOCAL: Bookmark = {
  id: "bm-1",
  bookId: "book-1",
  name: "Nombre viejo",
  pageNumber: 42,
  textPreview: "preview viejo",
  color: "blue",
  createdAt: 2000,
};

beforeEach(() => {
  saved.length = 0;
  listMock.mockReset();
  getBookmarksByBookMock.mockReset();
  getBookmarksByBookMock.mockResolvedValue([]);
});

describe("syncBookmarksFromCloud", () => {
  it("trae del cloud un marcador que no existe en local", async () => {
    listMock.mockResolvedValue([
      {
        id: "cloud-1",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Capítulo 3",
        pageNumber: 42,
        textPreview: "En un lugar de la Mancha",
        createdAt: "2026-05-01T10:00:00.000Z",
      },
    ]);

    const result = await syncBookmarksFromCloud("book-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("cloud-1");
    expect(result[0].name).toBe("Capítulo 3");
    expect(result[0].pageNumber).toBe(42);
    // El tipo local espera number, el cloud manda ISO-8601
    expect(typeof result[0].createdAt).toBe("number");
  });

  it("el cloud gana cuando el marcador existe en ambos lados", async () => {
    // Este es el caso que motivó la tarea: un rename hecho en el escritorio
    // tiene que llegar al teléfono.
    listMock.mockResolvedValue([
      {
        id: "bm-1",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Nombre nuevo",
        pageNumber: 42,
        textPreview: "preview nuevo",
        createdAt: "2026-05-01T10:00:00.000Z",
      },
    ]);

    const result = await syncBookmarksFromCloud("book-1", [SHARED_LOCAL]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Nombre nuevo");
    expect(result[0].textPreview).toBe("preview nuevo");
  });

  it("conserva los marcadores locales que el cloud no conoce", async () => {
    listMock.mockResolvedValue([]);

    const result = await syncBookmarksFromCloud("book-1", [LOCAL_ONLY]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("local-1");
  });

  it("hace la unión de ambos conjuntos sin duplicar", async () => {
    listMock.mockResolvedValue([
      {
        id: "cloud-1",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Del cloud",
        pageNumber: 5,
        textPreview: null,
        createdAt: "2026-05-01T10:00:00.000Z",
      },
    ]);

    // local-1 solo local, bm-1 en ambos, cloud-1 solo cloud
    const result = await syncBookmarksFromCloud("book-1", [
      LOCAL_ONLY,
      SHARED_LOCAL,
    ]);

    expect(result).toHaveLength(3);
    expect(result.map((b) => b.id).sort()).toEqual([
      "bm-1",
      "cloud-1",
      "local-1",
    ]);
  });

  it("normaliza textPreview null a string vacío", async () => {
    listMock.mockResolvedValue([
      {
        id: "cloud-1",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Sin preview",
        pageNumber: 5,
        textPreview: null,
        createdAt: "2026-05-01T10:00:00.000Z",
      },
    ]);

    const result = await syncBookmarksFromCloud("book-1");

    expect(result[0].textPreview).toBe("");
  });

  it("asigna un color a los marcadores que vienen del cloud", async () => {
    listMock.mockResolvedValue([
      {
        id: "cloud-1",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Sin color",
        pageNumber: 5,
        textPreview: null,
        createdAt: "2026-05-01T10:00:00.000Z",
      },
    ]);

    const result = await syncBookmarksFromCloud("book-1");

    expect(["yellow", "green", "blue", "pink", "orange"]).toContain(
      result[0].color,
    );
  });

  it("ordena por createdAt descendente, igual que el backend", async () => {
    listMock.mockResolvedValue([
      {
        id: "nuevo",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Reciente",
        pageNumber: 1,
        textPreview: null,
        createdAt: "2026-05-03T10:00:00.000Z",
      },
      {
        id: "viejo",
        userId: "user-1",
        userBookId: "ub-1",
        name: "Antiguo",
        pageNumber: 1,
        textPreview: null,
        createdAt: "2026-05-01T10:00:00.000Z",
      },
    ]);

    const result = await syncBookmarksFromCloud("book-1");

    expect(result.map((b) => b.id)).toEqual(["nuevo", "viejo"]);
  });

  it("no toca la base si el cloud devuelve una lista vacía y no hay locales", async () => {
    listMock.mockResolvedValue([]);

    const result = await syncBookmarksFromCloud("book-1", []);

    expect(result).toEqual([]);
    expect(saved).toHaveLength(0);
  });

  it("propaga el error si falla la llamada al cloud", async () => {
    listMock.mockRejectedValue(new Error("offline"));

    await expect(syncBookmarksFromCloud("book-1")).rejects.toThrow("offline");
  });
});
