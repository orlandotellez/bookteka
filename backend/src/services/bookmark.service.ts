import { AppError } from "@/helper/errors.js";
import { BookmarkRepository } from "@/repositories/bookmark.repository.js";
import { CreateBookmarkInput } from "@/types/bookmark.js";

const bookmarkRepository = new BookmarkRepository();

export class BookmarkService {
  // Obtener todos los bookmarks de un libro del usuario
  static getBookmarks = async (userId: string, bookId: string) => {
    const userBook = await bookmarkRepository.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    return bookmarkRepository.getBookmarksByUserBookId(userBook.id);
  };

  // Crear un nuevo bookmark
  static createBookmark = async (
    userId: string,
    bookId: string,
    data: Omit<CreateBookmarkInput, "userId" | "userBookId">
  ) => {
    const userBook = await bookmarkRepository.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    if (!data.name || typeof data.pageNumber !== "number") {
      throw new AppError("BAD_REQUEST", 400, "Faltan campos requeridos: name, pageNumber");
    }

    return bookmarkRepository.createBookmark({
      userId,
      userBookId: userBook.id,
      ...data,
    });
  };

  // Eliminar un bookmark
  static deleteBookmark = async (
    userId: string,
    bookId: string,
    bookmarkId: string
  ) => {
    const userBook = await bookmarkRepository.findUserBookAccess(userId, bookId);
    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado");
    }

    const bookmark = await bookmarkRepository.findBookmark(bookmarkId, userBook.id);
    if (!bookmark) {
      throw new AppError("NOT_FOUND", 404, "Bookmark no encontrado");
    }

    await bookmarkRepository.deleteBookmark(bookmarkId);
    return { success: true };
  };
}
