import { dbPrisma } from "@/config/prisma.js";
import type { IBooksRepository } from "@/modules/books/domain/books.interface.js";
import { CreateBookInput, UpsertUserBookInput } from "@/modules/books/domain/books.types.js";
import { audit_log, book, Prisma, user_book } from "@prisma/client";



export class BooksPrismaRepository implements IBooksRepository {
  getUserBooks = (userId: string) => {
    return dbPrisma.user_book.findMany({
      where: { userId },
      orderBy: { lastReadAt: "desc" },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            fileUrl: true,
            fileKey: true,
            size: true,
            createdAt: true,
          },
        },
      },
    });
  }

  findByHash = (fileHash: string) => {
    return dbPrisma.book.findUnique({
      where: { fileHash },
    });
  };

  createBook = (data: CreateBookInput) => {
    return dbPrisma.book.create({
      data,
    });
  };

  upsertUserBook = ({
    userId,
    bookId,
    readingTimeSeconds,
    scrollPosition,
    currentPage,
  }: UpsertUserBookInput) => {
    return dbPrisma.user_book.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      create: {
        userId,
        bookId,
        readingTimeSeconds,
        scrollPosition,
        currentPage: currentPage ?? 0,
      },
      update: {},
    });

  }

  findUserBook = (userId: string, bookId: string) => {
    return dbPrisma.user_book.findFirst({
      where: { userId, bookId },
      include: { book: true },
    });
  }

  countOtherUsers = (bookId: string, userId: string) => {
    return dbPrisma.user_book.count({
      where: {
        bookId,
        NOT: { userId },
      },
    });
  }

  deleteUserBook = (id: string) => {
    return dbPrisma.user_book.delete({
      where: { id },
    });
  }

  deleteBook = (id: string) => {
    return dbPrisma.book.delete({
      where: { id },
    });
  }

  createAuditLog = (data: Prisma.audit_logUncheckedCreateInput) => {
    return dbPrisma.audit_log.create({
      data,
    });
  };

  updateUserBook = (
    id: string,
    data: Prisma.user_bookUncheckedUpdateInput,
  ) => {
    return dbPrisma.user_book.update({
      where: { id },
      data,
    });
  };
}
