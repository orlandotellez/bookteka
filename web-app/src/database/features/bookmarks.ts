import type { Bookmark } from "@/types/book";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

// Obtiene todos los marcadores de un libro específico
export async function getBookmarksByBook(bookId: string): Promise<Bookmark[]> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return [];

  const db = await getDatabase();
  const tx = db.transaction("bookmarks", "readonly");
  const index = tx.store.index("by-bookId");
  const bookmarks = await index.getAll(bookId);
  return bookmarks.filter(b => b.userId === currentUserId);
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
