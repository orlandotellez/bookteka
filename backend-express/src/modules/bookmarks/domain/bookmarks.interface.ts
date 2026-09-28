import type { bookmark, user_book } from "@prisma/client";
import type { CreateBookmarkInput, UpdateBookmarkInput } from "@/modules/bookmarks/domain/bookmarks.types.js";
/**
 * Contrato de persistencia de marcadores.
 *
 * La capa `application` depende de esta interfaz, nunca de Prisma
 * directo. `infrastructure/<feature>.prisma.repository.ts` es la única
 * implementación, y los tests inyectan un fake que cumple el contrato.
 */
export interface IBookmarksRepository {
  findUserBookAccess: (userId: string, bookId: string) => Promise<user_book | null>;
  getBookmarksByUserBookId: (userBookId: string) => Promise<bookmark[]>;
  createBookmark: (data: CreateBookmarkInput) => Promise<bookmark>;
  findBookmark: (bookmarkId: string, userBookId: string) => Promise<bookmark | null>;
  updateBookmark: (
    bookmarkId: string,
    data: UpdateBookmarkInput,
  ) => Promise<bookmark>;
  deleteBookmark: (bookmarkId: string) => Promise<bookmark>;
}
