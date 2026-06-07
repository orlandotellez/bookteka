import type { Bookmark } from "@/types/book";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

// Obtiene todos los marcadores de un libro específico
// Migra automáticamente bookmarks viejos (con scrollPosition) al nuevo formato (pageNumber)
export async function getBookmarksByBook(bookId: string): Promise<Bookmark[]> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return [];

  const db = await getDatabase();
  const tx = db.transaction("bookmarks", "readwrite");
  const index = tx.store.index("by-bookId");
  const bookmarks = await index.getAll(bookId);
  const userBookmarks = bookmarks.filter(b => b.userId === currentUserId);

  // Migrar bookmarks viejos que tienen scrollPosition en vez de pageNumber
  const migrated: Bookmark[] = [];
  for (const bm of userBookmarks) {
    if (typeof (bm as any).pageNumber !== "number") {
      const oldBm = bm as any;
      console.warn("[Bookmark] Migrando bookmark con scrollPosition → pageNumber:", oldBm.id);
      const newBm: Bookmark = {
        id: oldBm.id,
        userId: oldBm.userId,
        bookId: oldBm.bookId,
        name: oldBm.name,
        pageNumber: 1, // default a página 1 (no podemos calcular desde scroll sin DOM)
        textPreview: oldBm.textPreview || "",
        createdAt: oldBm.createdAt,
      };
      await db.put("bookmarks", newBm);
      migrated.push(newBm);
    } else {
      migrated.push(bm);
    }
  }

  return migrated;
}

// Obtiene un marcador por ID
export async function getBookmark(id: string): Promise<Bookmark | undefined> {
  const db = await getDatabase();
  return db.get("bookmarks", id);
}

// Guarda un marcador en la base de datos
export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("bookmarks", { ...bookmark, userId: currentUserId });
}

// Elimina un marcador de la base de datos
export async function deleteBookmark(id: string): Promise<void> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;

  const db = await getDatabase();
  const bookmark = await db.get("bookmarks", id);
  if (bookmark && bookmark.userId === currentUserId) {
    await db.delete("bookmarks", id);
  }
}
