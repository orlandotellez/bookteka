import { dbPrisma } from "@/config/prisma.js";
import { CreateBookInput, UpsertUserBookInput } from "@/types/book.js";
import { audit_log, book, user_book } from "@prisma/client";

interface IBookRepository {
  getUserBooks: (userId: string) => Promise<user_book[] | null>,
  findByHash: (fileHash: string) => Promise<book | null>
  createBook: (data: CreateBookInput) => Promise<book>;
  upsertUserBook: (data: UpsertUserBookInput) => Promise<user_book>;
  findUserBook: (userId: string, bookId: string) => Promise<user_book | null>
  countOtherUsers: (bookId: string, userId: string) => Promise<number | null>
  deleteUserBook: (id: string) => Promise<user_book>
  deleteBook: (id: string) => Promise<book>
  createAuditLog: (data: any) => Promise<audit_log>
  updateUserBook: (id: string, data: any) => Promise<user_book>
}

export class BookRepository implements IBookRepository {
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

  createAuditLog = (data: any) => {
    return dbPrisma.audit_log.create({
      data,
    });
  }

  updateUserBook = (id: string, data: any) => {
    return dbPrisma.user_book.update({
      where: { id },
      data,
    });
  }
}
