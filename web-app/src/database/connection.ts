import { openDB, deleteDB, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION, type ReaderDBSchema } from "./schema";

// Instancia singleton de la base de datos
let dbInstance: IDBPDatabase<ReaderDBSchema> | null = null;

// Variable global para el usuario actual
let currentUserId: string | null = null;

// Establece el usuario actual para todas las operaciones de la base de datos
export function setCurrentUserId(userId: string): void {
  currentUserId = userId;
}

// Obtiene el usuario actual
export function getCurrentUserId(): string | null {
  return currentUserId;
}

// Obtiene la instancia actual de la base de datos
export function getDbInstance(): IDBPDatabase<ReaderDBSchema> | null {
  return dbInstance;
}

// Inicializa y devuelve la conexión a la base de datos, actualizando si es necesario
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