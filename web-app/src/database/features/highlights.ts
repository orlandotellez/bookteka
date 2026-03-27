import type { Highlight } from "@/types/book";
import { getDatabase } from "../connection";
import { getCurrentUserId } from "../connection";

// Obtiene todos los highlights de un libro específico
export async function getHighlightsByBook(bookId: string): Promise<Highlight[]> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return [];

  const db = await getDatabase();
  const tx = db.transaction("highlights", "readonly");
  const index = tx.store.index("by-bookId");
  const highlights = await index.getAll(bookId);
  return highlights.filter(h => h.userId === currentUserId);
}

// Guarda un highlight en la base de datos
export async function saveHighlight(highlight: Highlight): Promise<void> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const db = await getDatabase();
  await db.put("highlights", { ...highlight, userId: currentUserId });
}

// Elimina un highlight de la base de datos
export async function deleteHighlight(id: string): Promise<void> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return;

  const db = await getDatabase();
  const highlight = await db.get("highlights", id);
  if (highlight && highlight.userId === currentUserId) {
    await db.delete("highlights", id);
  }
}
