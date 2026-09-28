import type { Bookmark, HighlightColor } from "@/types/book";
import { getDatabase } from "./connection";
import { getBookmarksByBook } from "./features/bookmarks";
import { bookmarksApi, type BookmarkResponse } from "@/api/bookmark";

// Colores disponibles para marcador (mismos que los subrayados)
const BOOKMARK_COLORS: HighlightColor[] = ["yellow", "green", "blue", "pink", "orange"];

/** Devuelve un color aleatorio de la paleta de marcadores. */
export function pickRandomBookmarkColor(): HighlightColor {
  return BOOKMARK_COLORS[Math.floor(Math.random() * BOOKMARK_COLORS.length)];
}

/**
 * Convierte un marcador del cloud al tipo local `Bookmark`.
 *
 * El cloud manda `createdAt` como ISO-8601 y `textPreview` como `string | null`;
 * el tipo local espera `number` y `string`. El color no viaja: es una
 * decisión de presentación que se toma en el dispositivo.
 */
function fromCloud(
  cloud: BookmarkResponse,
  fallbackColor: HighlightColor,
): Bookmark {
  return {
    id: cloud.id,
    userId: cloud.userId,
    bookId: "", // lo rellena el caller: el cloud manda `userBookId`, no `bookId`
    name: cloud.name ?? "",
    pageNumber: cloud.pageNumber,
    textPreview: cloud.textPreview ?? "",
    color: fallbackColor,
    createdAt: new Date(cloud.createdAt).getTime(),
  };
}

/**
 * Trae los marcadores del libro desde el backend y los combina con los locales.
 *
 * Reglas del merge:
 * - Si el marcador existe en ambos lados, **gana el cloud**. Es lo que hace
 *   que un rename hecho en otro dispositivo llegue a este.
 * - Los marcadores que solo existen en local se conservan: pueden haberse
 *   creado sin conexión y todavía no haberse subido.
 * - El resultado queda ordenado por `createdAt` descendente, que es el orden
 *   que usa el backend (`BookmarkRepository.getBookmarksByUserBookId`).
 *
 * El cloud es la fuente de verdad, así que un marcador que el backend ya no
 * conoce y que existe en local **se conserva igual**: sin marca de "sincronizado"
 * en el tipo local no hay forma de distinguir "creado offline" de "borrado
 * en otro dispositivo", y descartar sería peor que duplicar.
 */
export async function syncBookmarksFromCloud(
  bookId: string,
  localBookmarks?: Bookmark[],
): Promise<Bookmark[]> {
  const cloudBookmarks = await bookmarksApi.list(bookId);

  // Si el caller no pasó los locales, se leen de IndexedDB.
  const locals = localBookmarks ?? (await readLocalBookmarks(bookId));

  const merged = mergeBookmarks(locals, cloudBookmarks, bookId);

  // Solo se escribe si hay algo que persistir.
  if (merged.length > 0) {
    const db = await getDatabase();
    for (const bookmark of merged) {
      await db.put("bookmarks", bookmark);
    }
  }

  return merged;
}

/**
 * Merge puro, sin efectos de salida. Exportado para testearlo sin base de datos.
 */
export function mergeBookmarks(
  locals: Bookmark[],
  cloud: BookmarkResponse[],
  bookId: string,
): Bookmark[] {
  const byId = new Map<string, Bookmark>();

  // 1. Locales primero: son la base.
  for (const local of locals) {
    byId.set(local.id, local);
  }

  // 2. El cloud pisa: para los ids compartidos, manda la versión del servidor.
  for (const cloudBookmark of cloud) {
    const existing = byId.get(cloudBookmark.id);
    byId.set(
      cloudBookmark.id,
      fromCloud(cloudBookmark, existing?.color ?? pickRandomBookmarkColor()),
    );
    // El cloud manda `userBookId`, no `bookId`. El store y la UI indexan por
    // `bookId`, así que hay que reconstruirlo.
    byId.get(cloudBookmark.id)!.bookId = bookId;
  }

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

async function readLocalBookmarks(bookId: string): Promise<Bookmark[]> {
  return getBookmarksByBook(bookId);
}
