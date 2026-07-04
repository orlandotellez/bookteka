import { AppError } from "@/helper/errors.js";
import { BookmarkRepository } from "@/repositories/bookmark.repository.js";
import { CreateBookmarkInput } from "@/types/bookmark.js";

const bookmarkRepository = new BookmarkRepository();

export class BookmarkService {
  constructor(private readonly repo: BookmarkRepository = bookmarkRepository) {}

  async getBookmarks(userId: string, bookId: string) {
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
  ) {
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

export const bookmarkService = new BookmarkService();
