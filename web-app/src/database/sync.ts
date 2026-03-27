import type { Book } from "@/types/book";
import { getDatabase } from "./connection";
import { getCurrentUserId } from "./connection";

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Descarga todos los libros del usuario desde el backend y los guarda en IndexedDB
// IMPORTANTE: Hace merge de datos para preservar progreso local (tiempo de lectura, posición, contenido)
export async function syncBooksFromCloud(): Promise<Book[]> {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error("No hay usuario autenticado");

  const response = await fetch(`${API_URL}/books`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Error al obtener libros del servidor");
  }

  const cloudBooks: Book[] = await response.json();

  const db = await getDatabase();

  // Guardar cada libro en IndexedDB haciendo merge de datos
  for (const cloudBook of cloudBooks) {
    // Obtener el libro local existente
    const localBook = await db.get("books", cloudBook.id);

    const localTime = localBook?.readingTimeSeconds ?? 0;
    const cloudTime = cloudBook.readingTimeSeconds ?? 0;
    const localScroll = localBook?.scrollPosition ?? 0;
    const cloudScroll = cloudBook.scrollPosition ?? 0;
    const localLastRead = localBook?.lastReadAt ?? 0;
    const cloudLastRead = cloudBook.lastReadAt ?? 0;

    const mergedBook: Book & { userId: string } = {
      ...cloudBook,
      userId: currentUserId,
      // Siempre tomar el mayor para no perder progreso
      readingTimeSeconds: Math.max(localTime, cloudTime),
      scrollPosition: Math.max(localScroll, cloudScroll),
      lastReadAt: Math.max(localLastRead, cloudLastRead) || Date.now(),
      // Preservar el contenido del PDF si existe localmente
      text: localBook?.text || cloudBook.text || "",
      // Preservar fileBlob si existe (no viene del servidor)
      fileBlob: localBook?.fileBlob,
      // Marcar como sincronizado ya que viene de la nube
      isSynced: true,
    };

    await db.put("books", mergedBook);
  }

  console.log(`Sincronizados ${cloudBooks.length} libros desde la nube (con merge de progreso local)`);
  return cloudBooks;
}
