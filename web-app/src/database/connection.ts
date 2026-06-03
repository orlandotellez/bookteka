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

  try {
    dbInstance = await tryOpenDB(DB_NAME, DB_VERSION);
  } catch (err) {
    // Si falla por versión (stored DB es más nueva), eliminar y recrear desde cero
    console.warn("Error al abrir DB, eliminando y recreando:", err);
    await deleteDB(DB_NAME);
    dbInstance = await tryOpenDB(DB_NAME, DB_VERSION);
  }

  return dbInstance;
}

async function tryOpenDB(name: string, version: number): Promise<IDBPDatabase<ReaderDBSchema>> {
  return openDB<ReaderDBSchema>(name, version, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      // BOOKS
      if (!db.objectStoreNames.contains("books")) {
        const bookStore = db.createObjectStore("books", { keyPath: "id" });
        bookStore.createIndex("by-lastRead", "lastReadAt");
        bookStore.createIndex("by-userId", "userId");
      } else {
        // Asegurar índices en upgrades
        const bookStore = transaction.objectStore("books");
        if (!bookStore.indexNames.contains("by-userId")) {
          bookStore.createIndex("by-userId", "userId");
        }
      }

      // BOOKMARKS
      if (!db.objectStoreNames.contains("bookmarks")) {
        const bookmarkStore = db.createObjectStore("bookmarks", {
          keyPath: "id",
        });
        bookmarkStore.createIndex("by-bookId", "bookId");
        bookmarkStore.createIndex("by-userId", "userId");
      } else {
        const bookmarkStore = transaction.objectStore("bookmarks");
        if (!bookmarkStore.indexNames.contains("by-userId")) {
          bookmarkStore.createIndex("by-userId", "userId");
        }
      }

      // --- USER PROFILE ---
      if (!db.objectStoreNames.contains("userProfile")) {
        db.createObjectStore("userProfile", { keyPath: "id" });
      }

      // HIGHLIGHTS 
      if (!db.objectStoreNames.contains("highlights")) {
        const highlightStore = db.createObjectStore("highlights", {
          keyPath: "id",
        });
        highlightStore.createIndex("by-bookId", "bookId");
        highlightStore.createIndex("by-userId", "userId");
      } else {
        const highlightStore = transaction.objectStore("highlights");
        if (!highlightStore.indexNames.contains("by-userId")) {
          highlightStore.createIndex("by-userId", "userId");
        }
      }

      // STREAKS 
      if (!db.objectStoreNames.contains("streaks")) {
        db.createObjectStore("streaks", { keyPath: "id" });
      }
    },
  });
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
