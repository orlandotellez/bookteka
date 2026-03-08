import { openDB, deleteDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import type { Book, Bookmark, Highlight } from "@/types/book";
import type { UserProfile } from "@/types/user";
import type { StreakData } from "@/types/reading";
export type { StreakData };

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Esquema de la base de datos IndexedDB
interface ReaderDBSchema extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { "by-lastRead": number; "by-userId": string };
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { "by-bookId": string; "by-userId": string };
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: { "by-bookId": string; "by-userId": string };
  };
  userProfile: {
    key: string;
    value: UserProfile;
  };
  streaks: {
    key: string;
    value: StreakData;
  };
}

const DB_NAME = "bookteka-db";
const DB_VERSION = 4;

let dbInstance: IDBPDatabase<ReaderDBSchema> | null = null;
let currentUserId: string | null = null;

// Establece el usuario actual para todas las operaciones de la base de datos
export function setCurrentUserId(userId: string): void {
  currentUserId = userId;
}

//Obtiene el usuario actual
export function getCurrentUserId(): string | null {
  return currentUserId;
}

// Inicializa y devuelve la conexión a la base de datos y de ser necesario actualiza
export async function getDatabase(): Promise<IDBPDatabase<ReaderDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ReaderDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {

      // Store de libros
      if (!db.objectStoreNames.contains("books")) {
        const bookStore = db.createObjectStore("books", { keyPath: "id" });
        bookStore.createIndex("by-lastRead", "lastReadAt");
        bookStore.createIndex("by-userId", "userId");
      } else if (oldVersion < 4) {
        const bookStore = transaction.objectStore("books");
        bookStore.createIndex("by-userId", "userId");
      }

      // Store de marcadores
      if (!db.objectStoreNames.contains("bookmarks")) {
        const bookmarkStore = db.createObjectStore("bookmarks", {
          keyPath: "id",
        });
        bookmarkStore.createIndex("by-bookId", "bookId");
        bookmarkStore.createIndex("by-userId", "userId");
      } else if (oldVersion < 4) {
        const bookmarkStore = transaction.objectStore("bookmarks");
        bookmarkStore.createIndex("by-userId", "userId");
      }

      // Store del perfil de usuario
      if (!db.objectStoreNames.contains("userProfile")) {
        db.createObjectStore("userProfile", { keyPath: "id" });
      }

      // Store de highlights
      if (!db.objectStoreNames.contains("highlights")) {
        const highlightStore = db.createObjectStore("highlights", {
          keyPath: "id",
        });
        highlightStore.createIndex("by-bookId", "bookId");
        highlightStore.createIndex("by-userId", "userId");
      } else if (oldVersion < 4) {
        const highlightStore = transaction.objectStore("highlights");
        highlightStore.createIndex("by-userId", "userId");
      }

      // Store de streaks
      if (!db.objectStoreNames.contains("streaks")) {
        db.createObjectStore("streaks", { keyPath: "id" });
      }
    },
  });

  return dbInstance;
}

// Obtiene todos los libros del usuario actual
export async function getAllBooks(): Promise<Book[]> {
  if (!currentUserId) return [];

  const db = await getDatabase();
  const tx = db.transaction("books", "readonly");
  const index = tx.store.index("by-userId");
  const books = await index.getAll(currentUserId);

  // Ordenar por lastRead descendente
  return books.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
}

// Obtener libro segun el id del usuario
export async function getBook(id: string): Promise<Book | undefined> {
  if (!currentUserId) return undefined;

  const db = await getDatabase();
  const book = await db.get("books", id);
  return book?.userId === currentUserId ? book : undefined;
}

// Guardar libro
export async function saveBook(book: Book): Promise<void> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("books", { ...book, userId: currentUserId });
}

// Eliminar libro
export async function deleteBook(id: string): Promise<void> {
  if (!currentUserId) return;

  const db = await getDatabase();

  // Verificar que el libro pertenece al usuario
  const book = await db.get("books", id);
  if (!book || book.userId !== currentUserId) return;

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
  if (!currentUserId) return;

  const db = await getDatabase();
  const book = await db.get("books", id);
  if (book && book.userId === currentUserId) {
    book.readingTimeSeconds += additionalSeconds;
    book.lastReadAt = Date.now();
    await db.put("books", book);
  }
}

export async function setBookReadingTime(
  id: string,
  totalSeconds: number,
): Promise<void> {
  if (!currentUserId) return;

  const db = await getDatabase();
  const book = await db.get("books", id);
  if (book && book.userId === currentUserId) {
    book.readingTimeSeconds = totalSeconds;
    await db.put("books", book);
  }
}

export async function updateBookScrollPosition(
  id: string,
  scrollPosition: number,
): Promise<void> {
  if (!currentUserId) return;

  const db = await getDatabase();
  const book = await db.get("books", id);
  if (book && book.userId === currentUserId) {
    book.scrollPosition = scrollPosition;
    book.lastReadAt = Date.now();
    await db.put("books", book);
  }
}

// BOOKMARKS
export async function getBookmarksByBook(bookId: string): Promise<Bookmark[]> {
  if (!currentUserId) return [];

  const db = await getDatabase();
  const tx = db.transaction("bookmarks", "readonly");
  const index = tx.store.index("by-bookId");
  const bookmarks = await index.getAll(bookId);
  return bookmarks.filter(b => b.userId === currentUserId);
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("bookmarks", { ...bookmark, userId: currentUserId });
}

export async function deleteBookmark(id: string): Promise<void> {
  if (!currentUserId) return;

  const db = await getDatabase();
  const bookmark = await db.get("bookmarks", id);
  if (bookmark && bookmark.userId === currentUserId) {
    await db.delete("bookmarks", id);
  }
}

// HIGHLIGHTS
export async function getHighlightsByBook(
  bookId: string,
): Promise<Highlight[]> {
  if (!currentUserId) return [];

  const db = await getDatabase();
  const tx = db.transaction("highlights", "readonly");
  const index = tx.store.index("by-bookId");
  const highlights = await index.getAll(bookId);
  return highlights.filter(h => h.userId === currentUserId);
}

export async function saveHighlight(highlight: Highlight): Promise<void> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("highlights", { ...highlight, userId: currentUserId });
}

export async function deleteHighlight(id: string): Promise<void> {
  if (!currentUserId) return;

  const db = await getDatabase();
  const highlight = await db.get("highlights", id);
  if (highlight && highlight.userId === currentUserId) {
    await db.delete("highlights", id);
  }
}

// USER PROFILE
export async function getUserProfile(): Promise<UserProfile | null> {
  if (!currentUserId) return null;

  const db = await getDatabase();
  const profile = await db.get("userProfile", currentUserId);
  return profile || null;
}

export async function getOrCreateUserProfile(): Promise<UserProfile> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  let profile = await db.get("userProfile", currentUserId);

  if (!profile) {
    profile = {
      id: currentUserId,
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
  if (!currentUserId) return;

  const profile = await getOrCreateUserProfile();
  profile.totalReadingTimeSeconds += additionalSeconds;

  const db = await getDatabase();
  await db.put("userProfile", profile);
}

export async function getTotalReadingTime(): Promise<number> {
  const books = await getAllBooks();
  return books.reduce((total, book) => total + book.readingTimeSeconds, 0);
}

export async function getStreakData(): Promise<StreakData | null> {
  if (!currentUserId) return null;

  const db = await getDatabase();
  const data = await db.get("streaks", currentUserId);
  return data ?? null;
}

export async function saveStreakData(streakData: StreakData): Promise<void> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("streaks", {
    userId: currentUserId,
    ...streakData,
  });
}

// Descarga todos los libros del usuario desde el backend y los guarda en IndexedDB
// IMPORTANTE: Hace merge de datos para preservar progreso local (tiempo de lectura, posición, contenido)
export async function syncBooksFromCloud(): Promise<Book[]> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const response = await fetch(`${API_URL}/books`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Error al obtener libros del servidor");
  }

  const cloudBooks: Book[] = await response.json();

  const db = await getDatabase();

  // Guardar cada libro en IndexedDB haciendo merge con datos locales
  for (const cloudBook of cloudBooks) {
    // Obtener el libro local existente
    const localBook = await db.get("books", cloudBook.id);

    // Merge: priorizar datos locales sobre los del servidor
    // El servidor tiene metadatos (nombre, fileUrl), pero el progreso es local
    const mergedBook: Book & { userId: string } = {
      ...cloudBook,
      userId: currentUserId,
      // Preservar datos locales importantes
      readingTimeSeconds: localBook?.readingTimeSeconds ?? cloudBook.readingTimeSeconds ?? 0,
      scrollPosition: localBook?.scrollPosition ?? cloudBook.scrollPosition ?? 0,
      lastReadAt: localBook?.lastReadAt ?? cloudBook.lastReadAt ?? Date.now(),
      // Preservar el contenido del PDF si existe localmente
      text: localBook?.text || cloudBook.text || "",
      // Preservar fileBlob si existe (no viene del servidor)
      fileBlob: localBook?.fileBlob,
    };

    await db.put("books", mergedBook);
  }

  console.log(`Sincronizados ${cloudBooks.length} libros desde la nube (con merge de progreso local)`);
  return cloudBooks;
}

// Elimina toda la base de datos local (para logout)
export async function clearDatabase(): Promise<void> {
  // Cerrar la conexión actual
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // Eliminar la base de datos
  await deleteDB(DB_NAME);

  // Resetear el usuario actual
  currentUserId = null;

  console.log("Base de datos local eliminada");
}

// Reinicia la conexión a la base de datos (para usar después de clearDatabase)
export async function resetDatabase(): Promise<void> {
  dbInstance = null;
  await getDatabase();
}

// Sube todos los libros locales al servidor
// IMPORTANTE: Esta función preserva el progreso local subiéndolo al backend
export async function syncBooksToCloud(): Promise<void> {
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const localBooks = await getAllBooks();

  if (localBooks.length === 0) {
    console.log("No hay libros locales para sincronizar");
    return;
  }

  // Subir cada libro al servidor
  for (const book of localBooks) {
    try {
      const response = await fetch(`${API_URL}/api/books/${book.id}/progress`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          readingTimeSeconds: book.readingTimeSeconds,
          scrollPosition: book.scrollPosition,
          lastReadAt: book.lastReadAt,
        }),
      });

      if (!response.ok) {
        console.warn(`Error al subir progreso del libro ${book.id}:`, response.statusText);
      }
    } catch (error) {
      console.warn(`Error al sincronizar libro ${book.id}:`, error);
    }
  }

  console.log(`Sincronizados ${localBooks.length} libros al servidor`);
}
