import type { Bookmark, HighlightColor } from "@/types/book";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

// Colores disponibles para marcador (mismos que los subrayados)
const BOOKMARK_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];

// Devuelve un color aleatorio para asignar a marcadores nuevos
function getRandomBookmarkColor(): HighlightColor {
  return BOOKMARK_COLORS[Math.floor(Math.random() * BOOKMARK_COLORS.length)];
}

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
        color: getRandomBookmarkColor(),
        createdAt: oldBm.createdAt,
      };
      await db.put("bookmarks", newBm);
      migrated.push(newBm);
    } else if (!((bm as any).color)) {
      const newBm: Bookmark = {
        ...bm,
        color: getRandomBookmarkColor(),
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

// Actualiza campos editables de un marcador (nombre y/o preview).
// Mantiene inmutables otros campos como pageNumber, createdAt y color.
export async function updateBookmark(
  id: string,
  data: { name?: string; textPreview?: string },
): Promise<Bookmark | undefined> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  const existing = await db.get("bookmarks", id);
  if (!existing || existing.userId !== currentUserId) return undefined;

  const updated: Bookmark = {
    ...existing,
    name: data.name?.trim() || existing.name,
    textPreview:
      data.textPreview !== undefined ? data.textPreview : existing.textPreview,
  };

  await db.put("bookmarks", updated);
  return updated;
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
