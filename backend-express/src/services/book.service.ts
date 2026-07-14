import { AppError } from "@/helper/errors.js";
import { generateFileHash, normalizedFileName } from "@/helper/format.js";
import { deleteR2Quietly } from "@/helper/r2.js";
import { r2 } from "@/lib/r2.js";
import { logger } from "@/lib/logger.js";
import { BookRepository } from "@/repositories/book.repository.js";
import { DeleteBookInput, DownloadBookInput, StreamBookInput, UpdateBookProgressInput, UploadBookInput } from "@/types/book.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env.js";
import { dbPrisma } from "@/config/prisma.js";

const bookRepository = new BookRepository();

export class BookService {
  constructor(private readonly repo: BookRepository = bookRepository) {}

  async getUserBooks(userId: string) {
    const userBooks = await this.repo.getUserBooks(userId);

    return userBooks.map((ub) => ({
      id: ub.book.id,
      name: ub.book.title,
      author: ub.book.author || "",
      createdAt: ub.book.createdAt.getTime(),
      lastReadAt: ub.lastReadAt?.getTime() || ub.book.createdAt.getTime(),
      readingTimeSeconds: ub.readingTimeSeconds || 0,
      scrollPosition: ub.scrollPosition || 0,
      currentPage: ub.currentPage || 0,
      fileUrl: ub.book.fileUrl,
      fileKey: ub.book.fileKey,
      isSynced: true,
    }));
  }

  async uploadBook({ userId, file, body }: UploadBookInput) {
    const dto = {
      title: body.title || file.originalname,
      author: body.author || "??",
      readingTimeSeconds: parseInt(body.readingTimeSeconds || "0"),
      scrollPosition: parseInt(body.scrollPosition || "0"),
    };

    const fileHash = generateFileHash(file.buffer);

    let book = await this.repo.findByHash(fileHash);

    let fileKey: string | null = null;

    if (!book) {
      const normalizedName = normalizedFileName(file.originalname);
      fileKey = `books/${userId}/${Date.now()}-${normalizedName}`;

      await r2.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: fileKey,
          Body: file.buffer,
          ContentType: "application/pdf",
        })
      );

      book = await this.repo.createBook({
        title: dto.title,
        author: dto.author,
        fileKey,
        fileUrl: `${env.R2_PUBLIC_DOMAIN}/${fileKey}`,
        fileHash,
        size: file.size,
      });
    }

    const userBook = await this.repo.upsertUserBook({
      userId,
      bookId: book.id,
      readingTimeSeconds: dto.readingTimeSeconds,
      scrollPosition: dto.scrollPosition,
    });

    return {
      bookId: book.id,
      userBookId: userBook.id,
    };
  }

  async deleteBook({ userId, bookId }: DeleteBookInput) {
    const userBook = await this.repo.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError(
        "NOT_FOUND",
        404,
        "Libro no encontrado para este usuario"
      );
    }

    const otherUsers = await this.repo.countOtherUsers(bookId, userId);

    if (otherUsers === 0) {
      await deleteR2Quietly(userBook.book.fileKey);
    }

    const auditData: Prisma.audit_logUncheckedCreateInput = {
      action: "DELETE",
      entityType: "BOOK",
      entityId: bookId,
      userId,
      metadata: {
        bookTitle: userBook.book.title,
        bookAuthor: userBook.book.author,
        fileKey: userBook.book.fileKey,
        fileSize: userBook.book.size,
        deletedAt: new Date().toISOString(),
      },
    };

    await dbPrisma.$transaction(async (tx) => {
      await tx.audit_log.create({ data: auditData });
      await tx.user_book.delete({ where: { id: userBook.id } });
      if (otherUsers === 0) {
        await tx.book.delete({ where: { id: bookId } });
      }
    });

    return {
      success: true,
      message: "Libro eliminado correctamente",
      auditId: bookId,
    };
  }

  async updateBookProgress({ userId, bookId, body }: UpdateBookProgressInput) {
    const userBook = await this.repo.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError(
        "NOT_FOUND",
        404,
        "Libro no encontrado para este usuario"
      );
    }

    const SCROLL_TOLERANCE_PX = 50;

    const isNewerTime =
      typeof body.readingTimeSeconds === "number" &&
      body.readingTimeSeconds > (userBook.readingTimeSeconds ?? 0);

    const isNewerScroll =
      typeof body.scrollPosition === "number" &&
      body.scrollPosition > (userBook.scrollPosition ?? 0) + SCROLL_TOLERANCE_PX;

    if (!isNewerTime && !isNewerScroll) {
      logger.debug(
        {
          bookId,
          userId,
          incoming: {
            scroll: body.scrollPosition,
            time: body.readingTimeSeconds,
          },
          persisted: {
            scroll: userBook.scrollPosition,
            time: userBook.readingTimeSeconds,
          },
        },
        "updateBookProgress noop: scroll/time sin avance"
      );
      return {
        success: true,
        readingTimeSeconds: userBook.readingTimeSeconds ?? 0,
        scrollPosition: userBook.scrollPosition ?? 0,
        lastReadAt: userBook.lastReadAt,
      };
    }

    const updateData: Prisma.user_bookUncheckedUpdateInput = {};

    if (isNewerTime) {
      updateData.readingTimeSeconds = body.readingTimeSeconds;
    }
    if (isNewerScroll) {
      updateData.scrollPosition = body.scrollPosition;
    }
    if (body.lastReadAt) {
      updateData.lastReadAt = body.lastReadAt;
    } else {
      updateData.lastReadAt = new Date();
    }

    const updated = await this.repo.updateUserBook(userBook.id, updateData);

    return {
      success: true,
      readingTimeSeconds: updated.readingTimeSeconds,
      scrollPosition: updated.scrollPosition,
      lastReadAt: updated.lastReadAt,
    };
  }

  async downloadBookWithUrl({ userId, bookId }: DownloadBookInput) {
    const userBook = await this.repo.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No es tu libro");
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: userBook.book.fileKey,
    });

    const url = await getSignedUrl(r2, command, {
      expiresIn: 60 * 15,
    });

    return { url };
  }

  async streamBookPdf({ userId, bookId }: StreamBookInput) {
    const userBook = await this.repo.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No es tu libro");
    }

    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: userBook.book.fileKey,
    });

    const pdfData = await r2.send(command);

    if (!pdfData.Body) {
      throw new AppError(
        "INTERNAL_ERROR",
        500,
        "Error al obtener el archivo"
      );
    }

    return {
      body: pdfData.Body as NodeJS.ReadableStream,
      headers: {
        contentType: "application/pdf",
        contentDisposition: `inline; filename="${userBook.book.title}.pdf"`,
        contentLength: pdfData.ContentLength,
      },
    };
  }
}

export const bookService = new BookService();
