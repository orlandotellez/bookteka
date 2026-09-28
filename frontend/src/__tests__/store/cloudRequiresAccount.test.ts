import { describe, it, expect, beforeEach, vi } from "vitest";


const uploadBook = vi.fn((_form: FormData) => Promise.resolve("server-book-1"));
const deleteBookInCloud = vi.fn((_id: string) => Promise.resolve());
const updateBookProgress = vi.fn((_id: string, _payload: unknown) =>
  Promise.resolve(),
);

vi.mock("@/api/book", () => ({
  uploadBook,
  deleteBookInCloud,
  updateBookProgress,
  downloadBook: vi.fn((_id: string) => Promise.resolve("https://x/y.pdf")),
}));

const localBook = {
  id: "book-1",
  name: "El Quijote",
  text: "En un lugar de la Mancha...",
  createdAt: 1000,
  lastReadAt: 2000,
  readingTimeSeconds: 60,
  scrollPosition: 0,
  totalPages: 10,
  isSynced: false,
  fileBlob: new Blob(["pdf"]),
};

vi.mock("@/database", () => ({
  getAllBooks: vi.fn(() => Promise.resolve([localBook])),
  getBook: vi.fn(() => Promise.resolve(localBook)),
  saveBook: vi.fn(() => Promise.resolve()),
  deleteBook: vi.fn(() => Promise.resolve()),
  setCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/pdf", () => ({
  processBookForReading: vi.fn(() => Promise.resolve(localBook)),
}));

// Sesión SINTÉTICA del modo local: tiene user.id, así que el check
// `session?.user?.id` del store la daba por válida. Exactamente por eso
// `getCachedSession` no sirve como gate de nube.
vi.mock("@/lib/sessionCache", () => ({
  getCachedSession: vi.fn(() =>
    Promise.resolve({
      user: { id: "local-user", name: "Biblioteca local" },
      session: { id: "local", token: "local", userId: "local-user" },
    }),
  ),
  invalidateSessionCache: vi.fn(),
}));

// Estado de preferencias mutable para poder cambiar de modo en cada test.
const prefs = {
  authMode: "local" as "local" | "server",
  cloudSyncEnabled: true,
};

vi.mock("@/store/userPreferencesStore", () => ({
  LOCAL_USER_ID: "local-user",
  useUserPreferences: {
    getState: vi.fn(() => ({ ...prefs })),
    setState: vi.fn(),
    subscribe: vi.fn(() => () => { }),
  },
}));

vi.mock("@/api/bookmark", () => ({
  createBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
  updateBookmark: vi.fn(),
}));

const { useBookStore } = await import("@/store/bookStore");
const { CLOUD_REQUIRES_ACCOUNT_ERROR } = await import("@/lib/cloud");

beforeEach(() => {
  uploadBook.mockClear();
  deleteBookInCloud.mockClear();
  updateBookProgress.mockClear();
  prefs.authMode = "local";
  prefs.cloudSyncEnabled = true;
  useBookStore.setState({ uploadingBookId: null });
});


describe("nube en modo local", () => {
  it("el mensaje explica que hace falta una cuenta", () => {
    expect(CLOUD_REQUIRES_ACCOUNT_ERROR).toMatch(/requiere una cuenta/i);
  });

  it("uploadBookToCloud NO toca la red en modo local", async () => {
    await expect(useBookStore.getState().uploadBookToCloud("book-1")).rejects.toThrow(
      CLOUD_REQUIRES_ACCOUNT_ERROR,
    );
    expect(uploadBook).not.toHaveBeenCalled();
  });

  it("downloadBookFromCloud NO toca la red en modo local", async () => {
    await expect(
      useBookStore.getState().downloadBookFromCloud("book-1"),
    ).rejects.toThrow(CLOUD_REQUIRES_ACCOUNT_ERROR);
  });

  it("el progreso de lectura NO se PATCHea en modo local", async () => {
    await useBookStore.getState().updateReadingTime("book-1", 30);
    // Aunque el libro estuviera marcado como synced, el gate debe cortar.
    expect(updateBookProgress).not.toHaveBeenCalled();
  });
});

describe("nube en modo servidor", () => {
  beforeEach(() => {
    prefs.authMode = "server";
  });

  it("uploadBookToCloud sí intenta la subida", async () => {
    await useBookStore
      .getState()
      .uploadBookToCloud("book-1")
      .catch(() => undefined);
    // No debe fallar por el gate de "requiere cuenta".
    expect(uploadBook).toHaveBeenCalled();
  });
});
