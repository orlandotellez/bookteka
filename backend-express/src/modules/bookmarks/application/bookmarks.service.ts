import { AppError } from "@/core/errors/AppError.js";
import { BookmarksPrismaRepository } from "@/modules/bookmarks/infrastructure/bookmarks.prisma.repository.js";
import { CreateBookmarkInput, UpdateBookmarkInput } from "@/modules/bookmarks/domain/bookmarks.types.js";
import type { BookmarkResponseDTO } from "@/modules/bookmarks/domain/bookmarks.entities.js";
import type { UpdateBookmarkBodySchema } from "@/modules/bookmarks/presentation/bookmarks.dto.js";
import type { z } from "zod";

const bookmarksPrismaRepository = new BookmarksPrismaRepository();

export class BookmarksService {
  constructor(private readonly repo: BookmarksPrismaRepository = bookmarksPrismaRepository) {}

  async getBookmarks(
    userId: string,
    bookId: string,
  ): Promise<BookmarkResponseDTO[]> {
    const userBook = await this.repo.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    return this.repo.getBookmarksByUserBookId(userBook.id);
  }

  async createBookmark(
    userId: string,
    bookId: string,
    data: Omit<CreateBookmarkInput, "userId" | "userBookId">,
  ): Promise<BookmarkResponseDTO> {
    const userBook = await this.repo.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    return this.repo.createBookmark({
      userId,
      userBookId: userBook.id,
      ...data,
    });
  }

  /**
   * Actualiza los campos editables de un marcador.
   *
   * Reusa el mismo patrón de doble verificación que `deleteBookmark`: primero
   * confirma que el usuario tiene acceso al libro, después que el marcador
   * pertenece a ese `user_book`. Conocer un `bookmarkId` ajeno no alcanza.
   */
  async updateBookmark(
    userId: string,
    bookId: string,
    bookmarkId: string,
    data: z.infer<typeof UpdateBookmarkBodySchema>,
  ): Promise<BookmarkResponseDTO> {
    const userBook = await this.repo.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    const bookmark = await this.repo.findBookmark(bookmarkId, userBook.id);
    if (!bookmark) {
      throw new AppError("NOT_FOUND", 404, "Bookmark no encontrado");
    }

    return this.repo.updateBookmark(bookmarkId, data as UpdateBookmarkInput);
  }

  async deleteBookmark(userId: string, bookId: string, bookmarkId: string) {
    const userBook = await this.repo.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    const bookmark = await this.repo.findBookmark(bookmarkId, userBook.id);
    if (!bookmark) {
      throw new AppError("NOT_FOUND", 404, "Bookmark no encontrado");
    }

    await this.repo.deleteBookmark(bookmarkId);
    return { success: true };
  }
}

export const bookmarksService = new BookmarksService();
