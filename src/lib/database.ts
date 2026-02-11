import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import type { Book, Bookmark, Highlight } from "@/types/book";
import type { UserProfile } from "@/types/user";
import type { StreakData } from "@/types/reading";
export type { StreakData };

/**
 * Esquema de la base de datos IndexedDB
 */
interface ReaderDBSchema extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { "by-lastRead": number };
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { "by-bookId": string };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: { "by-bookId": string };
  };
  userProfile: {
    key: string;
    value: UserProfile;
  };
}

const DB_NAME = "pdf-reader-db";
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<ReaderDBSchema> | null = null;

/**
 * Inicializa y devuelve la conexión a la base de datos
 */
export async function getDatabase(): Promise<IDBPDatabase<ReaderDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ReaderDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store de libros
      if (!db.objectStoreNames.contains("books")) {
        const bookStore = db.createObjectStore("books", { keyPath: "id" });
        bookStore.createIndex("by-lastRead", "lastReadAt");
      }

      // Store de marcadores
      if (!db.objectStoreNames.contains("bookmarks")) {
        const bookmarkStore = db.createObjectStore("bookmarks", {
          keyPath: "id",
        });
        bookmarkStore.createIndex("by-bookId", "bookId");
      }

      // Store del perfil de usuario
      if (!db.objectStoreNames.contains("userProfile")) {
        db.createObjectStore("userProfile", { keyPath: "id" });
      }

      // Store de highlights (versión 2)
      if (!db.objectStoreNames.contains("highlights")) {
        const highlightStore = db.createObjectStore("highlights", {
          keyPath: "id",
        });
        highlightStore.createIndex("by-bookId", "bookId");
      }
    },
  });

  return dbInstance;
}

// BOOKS

export async function getAllBooks(): Promise<Book[]> {
  const db = await getDatabase();
  const books = await db.getAllFromIndex("books", "by-lastRead");
  return books.reverse();
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDatabase();
  return db.get("books", id);
}

export async function saveBook(book: Book): Promise<void> {
  const db = await getDatabase();
  await db.put("books", book);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete("books", id);

  // También eliminar marcadores asociados
  const bookmarks = await getBookmarksByBook(id);
  for (const bookmark of bookmarks) {
    await db.delete("bookmarks", bookmark.id);
  }

  // También eliminar highlights asociados
  const highlights = await getHighlightsByBook(id);
  for (const highlight of highlights) {
    await db.delete("highlights", highlight.id);
  }
}

export async function updateBookReadingTime(
  id: string,
  additionalSeconds: number,
): Promise<void> {
  const db = await getDatabase();
  const book = await db.get("books", id);
  if (book) {
    book.readingTimeSeconds += additionalSeconds;
    book.lastReadAt = Date.now();
    await db.put("books", book);
  }
}

export async function setBookReadingTime(
  id: string,
  totalSeconds: number,
): Promise<void> {
  const db = await getDatabase();
  const book = await db.get("books", id);
  if (book) {
    book.readingTimeSeconds = totalSeconds;
    await db.put("books", book);
  }
}

export async function updateBookScrollPosition(
  id: string,
  scrollPosition: number,
): Promise<void> {
  const db = await getDatabase();
  const book = await db.get("books", id);
  if (book) {
    book.scrollPosition = scrollPosition;
    book.lastReadAt = Date.now();
    await db.put("books", book);
  }
}

// BOOKMARKS

export async function getBookmarksByBook(bookId: string): Promise<Bookmark[]> {
  const db = await getDatabase();
  return db.getAllFromIndex("bookmarks", "by-bookId", bookId);
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await getDatabase();
  await db.put("bookmarks", bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete("bookmarks", id);
}

// HIGHLIGHTS

export async function getHighlightsByBook(
  bookId: string,
): Promise<Highlight[]> {
  const db = await getDatabase();
  return db.getAllFromIndex("highlights", "by-bookId", bookId);
}

export async function saveHighlight(highlight: Highlight): Promise<void> {
  const db = await getDatabase();
  await db.put("highlights", highlight);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete("highlights", id);
}

// USER PROFILE

const DEFAULT_USER_ID = "default-user";

export async function getUserProfile(): Promise<UserProfile> {
  const db = await getDatabase();
  let profile = await db.get("userProfile", DEFAULT_USER_ID);

  if (!profile) {
    profile = {
      id: DEFAULT_USER_ID,
      createdAt: Date.now(),
      totalReadingTimeSeconds: 0,
    };
    await db.put("userProfile", profile);
  }

  return profile;
}

export async function updateUserReadingTime(
  additionalSeconds: number,
): Promise<void> {
  const db = await getDatabase();
  const profile = await getUserProfile();
  profile.totalReadingTimeSeconds += additionalSeconds;
  await db.put("userProfile", profile);
}

export async function getTotalReadingTime(): Promise<number> {
  const books = await getAllBooks();
  return books.reduce((total, book) => total + book.readingTimeSeconds, 0);
}

// ========== STREAK ==========

const STREAK_KEY = "reading-streak";

export async function getStreakData(): Promise<StreakData | null> {
  const db = await getDatabase();
  const data = await db.get("userProfile", STREAK_KEY);
  if (data && "currentStreak" in data) {
    return data as unknown as StreakData;
  }
  return null;
}

export async function saveStreakData(streakData: StreakData): Promise<void> {
  const db = await getDatabase();
  await db.put("userProfile", {
    id: STREAK_KEY,
    ...streakData,
  } as unknown as UserProfile);
}
