import { AppError } from "@/helper/errors.js";
import { generateFileHash, normalizedFileName } from "@/helper/format.js";
import { r2 } from "@/lib/r2.js";
import { BookRepository } from "@/repositories/book.repository.js";
import { DeleteBookInput, DownloadBookInput, StreamBookInput, UpdateBookProgressInput, UploadBookInput } from "@/types/book.js";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "better-auth";

const bookRepository = new BookRepository()

export class BookService {
  static getUserBooks = async (userId: string) => {
    const userBooks = await bookRepository.getUserBooks(userId);

    return userBooks.map((ub) => ({
      id: ub.book.id,
      title: ub.book.title,
      author: ub.book.author || "",
      createdAt: ub.book.createdAt.getTime(),
      lastReadAt: ub.lastReadAt?.getTime() || ub.book.createdAt.getTime(),
      readingTimeSeconds: ub.readingTimeSeconds || 0,
      scrollPosition: ub.scrollPosition || 0,
      totalPages: undefined,
      fileUrl: ub.book.fileUrl,
      fileKey: ub.book.fileKey,
    }));
  };

  static uploadBook = async ({
    userId,
    file,
    body,
  }: UploadBookInput) => {
    // DTO parsing (puedes mover esto luego a Zod)
    const dto = {
      title: body.title || file.originalname,
      author: body.author || "??",
      readingTimeSeconds: parseInt(body.readingTimeSeconds || "0"),
      scrollPosition: parseInt(body.scrollPosition || "0"),
    };

    // hash del archivo
    const fileHash = generateFileHash(file.buffer);

    // verificar si existe
    let book = await bookRepository.findByHash(fileHash);

    let fileKey: string | null = null;

    if (!book) {
      const normalizedName = normalizedFileName(file.originalname);
      fileKey = `books/${userId}/${Date.now()}-${normalizedName}`;

      // subir a R2
      await r2.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: fileKey,
          Body: file.buffer,
          ContentType: "application/pdf",
        })
      );

      // crear libro
      book = await bookRepository.createBook({
        title: dto.title,
        author: dto.author,
        fileKey,
        fileUrl: `${env.R2_PUBLIC_DOMAIN}/${fileKey}`,
        fileHash,
        size: file.size,
      });
    }

    // relación usuario-libro
    const userBook = await bookRepository.upsertUserBook({
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

  static deleteBook = async ({ userId, bookId }: DeleteBookInput) => {
    // 1. buscar relación user-book
    const userBook = await bookRepository.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError(
        "NOT_FOUND",
        404,
        "Libro no encontrado para este usuario"
      );
    }

    // 2. verificar si otros usuarios usan el libro
    const otherUsers = await bookRepository.countOtherUsers(bookId, userId);

    // 3. eliminar archivo de R2 si no hay otros usuarios
    if (otherUsers === 0) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: userBook.book.fileKey,
          })
        );
      } catch (err) {
        console.error("R2 delete error:", err);
      }
    }

    // 4. auditoría
    await bookRepository.createAuditLog({
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
    });

    // 5. eliminar user_book
    await bookRepository.deleteUserBook(userBook.id);

    // 6. eliminar book si no hay referencias
    if (otherUsers === 0) {
      await bookRepository.deleteBook(bookId);
    }

    return {
      success: true,
      message: "Libro eliminado correctamente",
      auditId: bookId,
    };
  };

  static updateBookProgress = async ({
    userId,
    bookId,
    body,
  }: UpdateBookProgressInput) => {
    // 1. verificar relación usuario-libro
    const userBook = await bookRepository.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError(
        "NOT_FOUND",
        404,
        "Libro no encontrado para este usuario"
      );
    }

    // 2. construir update dinámico
    const updateData: any = {};

    if (typeof body.readingTimeSeconds === "number") {
      updateData.readingTimeSeconds = body.readingTimeSeconds;
    }

    if (typeof body.scrollPosition === "number") {
      updateData.scrollPosition = body.scrollPosition;
    }

    if (body.lastReadAt) {
      updateData.lastReadAt = new Date(body.lastReadAt);
    } else if (
      body.readingTimeSeconds !== undefined ||
      body.scrollPosition !== undefined
    ) {
      updateData.lastReadAt = new Date();
    }

    // 3. update en repo
    const updated = await bookRepository.updateUserBook(
      userBook.id,
      updateData
    );

    return {
      success: true,
      readingTimeSeconds: updated.readingTimeSeconds,
      scrollPosition: updated.scrollPosition,
      lastReadAt: updated.lastReadAt,
    };
  };

  static downloadBookWithUrl = async ({
    userId,
    bookId,
  }: DownloadBookInput) => {
    // 1. verificar acceso del usuario al libro
    const userBook = await bookRepository.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError(
        "FORBIDDEN",
        403,
        "No es tu libro"
      );
    }

    // 2. generar comando S3/R2
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: userBook.book.fileKey,
    });

    // 3. generar url firmada (15 min)
    const url = await getSignedUrl(r2, command, {
      expiresIn: 60 * 15,
    });

    return { url };
  };

  static streamBookPdf = async ({
    userId,
    bookId,
  }: StreamBookInput) => {
    // 1. verificar acceso
    const userBook = await bookRepository.findUserBook(userId, bookId);

    if (!userBook) {
      throw new AppError("FORBIDDEN", 403, "No es tu libro");
    }

    // 2. pedir archivo a R2
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
  };

}
