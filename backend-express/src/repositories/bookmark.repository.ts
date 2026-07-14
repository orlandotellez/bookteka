import { dbPrisma } from "@/config/prisma.js";
import { CreateBookmarkInput } from "@/types/bookmark.js";
import { bookmark, user_book } from "@prisma/client";

interface IBookmarkRepository {
  findUserBookAccess: (userId: string, bookId: string) => Promise<user_book | null>;
  getBookmarksByUserBookId: (userBookId: string) => Promise<bookmark[]>;
  createBookmark: (data: CreateBookmarkInput) => Promise<bookmark>;
  findBookmark: (bookmarkId: string, userBookId: string) => Promise<bookmark | null>;
  deleteBookmark: (bookmarkId: string) => Promise<bookmark>;
}

export class BookmarkRepository implements IBookmarkRepository {
  // Verifica que el usuario tenga acceso al libro (vía user_book)
  findUserBookAccess = (userId: string, bookId: string) => {
    return dbPrisma.user_book.findFirst({
      where: { userId, bookId },
    });
  };

  // Obtiene todos los bookmarks de un user_book
  getBookmarksByUserBookId = (userBookId: string) => {
    return dbPrisma.bookmark.findMany({
      where: { userBookId },
      orderBy: { createdAt: "desc" },
    });
  };

  // Crea un nuevo bookmark
  createBookmark = (data: CreateBookmarkInput) => {
    return dbPrisma.bookmark.create({
      data: {
        userId: data.userId,
        userBookId: data.userBookId,
        name: data.name,
        pageNumber: data.pageNumber,
        textPreview: data.textPreview,
      },
    });
  };

  // Busca un bookmark verificando que pertenezca al user_book
  findBookmark = (bookmarkId: string, userBookId: string) => {
    return dbPrisma.bookmark.findFirst({
      where: {
        id: bookmarkId,
        userBookId,
      },
    });
  };

  // Elimina un bookmark por id
  deleteBookmark = (bookmarkId: string) => {
    return dbPrisma.bookmark.delete({
      where: { id: bookmarkId },
    });
  };
}
