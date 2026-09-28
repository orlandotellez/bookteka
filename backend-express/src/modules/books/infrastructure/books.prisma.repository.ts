import { dbPrisma } from "@/config/prisma.js";
import type { IBooksRepository } from "@/modules/books/domain/books.interface.js";
import { CreateBookInput, UpsertUserBookInput } from "@/modules/books/domain/books.types.js";
import { Prisma, PrismaClient } from "@prisma/client";

export class BooksPrismaRepository implements IBooksRepository {
  constructor(private readonly client: PrismaClient = dbPrisma) {}

  transaction = <T>(
    fn: (tx: IBooksRepository) => Promise<T>,
  ): Promise<T> =>
    this.client.$transaction(async (tx) =>
      fn(new BooksPrismaRepository(tx as unknown as PrismaClient)),
    );

  getUserBooks = (userId: string) => {
    return this.client.user_book.findMany({
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
    return this.client.book.findUnique({
      where: { fileHash },
    });
  };

  createBook = (data: CreateBookInput) => {
    return this.client.book.create({
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
    return this.client.user_book.upsert({
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
    return this.client.user_book.findFirst({
      where: { userId, bookId },
      include: { book: true },
    });
  }

  countOtherUsers = (bookId: string, userId: string) => {
    return this.client.user_book.count({
      where: {
        bookId,
        NOT: { userId },
      },
    });
  }

  deleteUserBook = (id: string) => {
    return this.client.user_book.delete({
      where: { id },
    });
  }

  deleteBook = (id: string) => {
    return this.client.book.delete({
      where: { id },
    });
  }

  createAuditLog = (data: Prisma.audit_logUncheckedCreateInput) => {
    return this.client.audit_log.create({
      data,
    });
  };

  updateUserBook = (
    id: string,
    data: Prisma.user_bookUncheckedUpdateInput,
  ) => {
    return this.client.user_book.update({
      where: { id },
      data,
    });
  };
}