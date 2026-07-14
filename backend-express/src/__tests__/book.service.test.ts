// @ts-nocheck
import { jest } from "@jest/globals";
import { Readable } from "node:stream";

jest.unstable_mockModule("@/config/prisma.js", () => {
  const dbPrismaClient = {
    user_book: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    book: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    audit_log: {
      create: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown): Promise<unknown> => {
      if (typeof arg === "function") {
        return (
          arg as (tx: typeof dbPrismaClient) => Promise<unknown>
        )(dbPrismaClient);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
  return { dbPrisma: dbPrismaClient };
});

jest.unstable_mockModule("@/lib/r2.js", () => ({
  r2: { send: jest.fn(async () => ({})) },
}));

jest.unstable_mockModule("@/helper/r2.js", () => ({
  deleteR2Quietly: jest.fn(async () => undefined),
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(async () => "https://signed.example.com/file.pdf"),
}));

jest.unstable_mockModule("@/lib/logger.js", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
}));

jest.unstable_mockModule("@/helper/format.js", () => ({
  generateFileHash: jest.fn(() => "fake-hash-123"),
  normalizedFileName: jest.fn(() => "fake-filename.pdf"),
}));

const { BookService } = await import("@/services/book.service.js");
const { AppError } = await import("@/helper/errors.js");
const { dbPrisma } = await import("@/config/prisma.js");
const { r2 } = await import("@/lib/r2.js");
const { deleteR2Quietly } = await import("@/helper/r2.js");
const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

const makeMockRepo = (overrides: any = {}): any => ({
  getUserBooks: jest.fn(async () => []),
  findByHash: jest.fn(async () => null),
  createBook: jest.fn(async () => undefined),
  upsertUserBook: jest.fn(async () => undefined),
  findUserBook: jest.fn(async () => null),
  countOtherUsers: jest.fn(async () => 0),
  deleteUserBook: jest.fn(async () => undefined),
  deleteBook: jest.fn(async () => undefined),
  createAuditLog: jest.fn(async () => undefined),
  updateUserBook: jest.fn(async () => undefined),
  ...overrides,
});

describe("BookService.getUserBooks", () => {
  it("plana cada user_book al shape del cliente con timestamp ms", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    const lastReadAt = new Date("2024-06-15T00:00:00Z");
    const repo = makeMockRepo({
      getUserBooks: jest.fn(async () => [
        {
          id: "ub1",
          userId: "user1",
          bookId: "book1",
          currentPage: 42,
          scrollPosition: 1234,
          readingTimeSeconds: 1800,
          lastReadAt,
          createdAt,
          book: {
            id: "book1",
            title: "El Aleph",
            author: "Borges",
            fileUrl: "https://r2.example/book1.pdf",
            fileKey: "books/book1.pdf",
            fileHash: "hash1",
            size: 1000,
            createdAt,
          },
        },
      ]),
    });
    const svc = new BookService(repo as never);

    const result = await svc.getUserBooks("user1");

    expect(result).toEqual([
      {
        id: "book1",
        name: "El Aleph",
        author: "Borges",
        createdAt: createdAt.getTime(),
        lastReadAt: lastReadAt.getTime(),
        readingTimeSeconds: 1800,
        scrollPosition: 1234,
        currentPage: 42,
        fileUrl: "https://r2.example/book1.pdf",
        fileKey: "books/book1.pdf",
        isSynced: true,
      },
    ]);
  });

  it("retorna array vacío cuando el usuario no tiene user_books", async () => {
    const repo = makeMockRepo({
      getUserBooks: jest.fn(async () => []),
    });
    const svc = new BookService(repo as never);

    const result = await svc.getUserBooks("user1");

    expect(result).toEqual([]);
  });
});

describe("BookService.uploadBook", () => {
  const fakeFile = {
    originalname: "test.pdf",
    buffer: Buffer.from("fake pdf"),
    size: 9,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skip R2 upload + skip createBook cuando el hash ya existe", async () => {
    const existingBook = {
      id: "existing-book-id",
      title: "Existing",
      author: "Someone",
      fileKey: "books/existing.pdf",
      fileUrl: "https://r2.example/existing.pdf",
      fileHash: "fake-hash-123",
      size: 1000,
    };
    const repo = makeMockRepo({
      findByHash: jest.fn(async () => existingBook),
      upsertUserBook: jest.fn(async () => ({ id: "ub-new" })),
    });
    const svc = new BookService(repo as never);

    const result = await svc.uploadBook({
      userId: "user1",
      file: fakeFile,
      body: { title: "t", author: "a", readingTimeSeconds: "0", scrollPosition: "0" },
    });

    expect(repo.findByHash).toHaveBeenCalledWith("fake-hash-123");
    expect(r2.send).not.toHaveBeenCalled(); // R2 NO se invocó
    expect(repo.createBook).not.toHaveBeenCalled();
    expect(repo.upsertUserBook).toHaveBeenCalledWith({
      userId: "user1",
      bookId: "existing-book-id",
      readingTimeSeconds: 0,
      scrollPosition: 0,
    });
    expect(result).toEqual({
      bookId: "existing-book-id",
      userBookId: "ub-new",
    });
  });

  it("sube a R2 + crea libro + upsert userBook cuando es archivo nuevo", async () => {
    const repo = makeMockRepo({
      findByHash: jest.fn(async () => null),
      createBook: jest.fn(async (data) => ({ id: "new-book-id", ...data })),
      upsertUserBook: jest.fn(async () => ({ id: "ub-new" })),
    });
    const svc = new BookService(repo as never);

    const result = await svc.uploadBook({
      userId: "user1",
      file: fakeFile,
      body: { title: "Custom Title", author: "Custom Author", readingTimeSeconds: "100", scrollPosition: "200" },
    });

    expect(repo.findByHash).toHaveBeenCalledWith("fake-hash-123");
    expect(r2.send).toHaveBeenCalledTimes(1); // R2 PutObjectCommand
    expect(repo.createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Custom Title",
        author: "Custom Author",
        fileKey: expect.stringContaining("books/user1/"),
        fileHash: "fake-hash-123",
        size: 9,
      }),
    );
    expect(repo.upsertUserBook).toHaveBeenCalledWith({
      userId: "user1",
      bookId: "new-book-id",
      readingTimeSeconds: 100,
      scrollPosition: 200,
    });
    expect(result.bookId).toBe("new-book-id");
  });
});

describe("BookService.deleteBook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 404 cuando el userBook no existe — sin tocar txn", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => null),
    });
    const svc = new BookService(repo as never);

    await expect(svc.deleteBook({ userId: "user1", bookId: "book1" })).rejects.toThrow(
      new AppError("NOT_FOUND", 404, "Libro no encontrado para este usuario"),
    );
    expect(dbPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("con `otherUsers=0`: borra R2 + escribe los 3 writes en una transacción", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        book: {
          id: "book1",
          title: "El Aleph",
          author: "Borges",
          fileKey: "books/user1/book1.pdf",
          size: 1000,
        },
      })),
      countOtherUsers: jest.fn(async () => 0),
    });
    const svc = new BookService(repo as never);

    const result = await svc.deleteBook({ userId: "user1", bookId: "book1" });

    expect(deleteR2Quietly).toHaveBeenCalledWith("books/user1/book1.pdf");

    expect(dbPrisma.$transaction).toHaveBeenCalledTimes(1);

    expect(dbPrisma.audit_log.create).toHaveBeenCalledTimes(1);
    expect(dbPrisma.user_book.delete).toHaveBeenCalledWith({
      where: { id: "ub1" },
    });
    expect(dbPrisma.book.delete).toHaveBeenCalledWith({
      where: { id: "book1" },
    });

    expect(result).toEqual({
      success: true,
      message: "Libro eliminado correctamente",
      auditId: "book1",
    });
  });

  it("con `otherUsers>0`: skip R2 + tx con sólo 2 writes (sin book.delete)", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        book: {
          id: "book1",
          title: "El Aleph",
          author: "Borges",
          fileKey: "books/shared/book1.pdf",
          size: 1000,
        },
      })),
      countOtherUsers: jest.fn(async () => 2),
    });
    const svc = new BookService(repo as never);

    await svc.deleteBook({ userId: "user1", bookId: "book1" });

    expect(deleteR2Quietly).not.toHaveBeenCalled();

    expect(dbPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(dbPrisma.audit_log.create).toHaveBeenCalledTimes(1);
    expect(dbPrisma.user_book.delete).toHaveBeenCalledTimes(1);
    expect(dbPrisma.book.delete).not.toHaveBeenCalled();
  });
});

describe("BookService.updateBookProgress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 404 cuando el userBook no existe", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => null),
    });
    const svc = new BookService(repo as never);

    await expect(
      svc.updateBookProgress({ userId: "user1", bookId: "book1", body: {} }),
    ).rejects.toThrow(
      new AppError("NOT_FOUND", 404, "Libro no encontrado para este usuario"),
    );
    expect(repo.updateUserBook).not.toHaveBeenCalled();
  });

  it("noop: scroll dentro de tolerancia y time no avanza → retorna persisted sin escribir", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        readingTimeSeconds: 100,
        scrollPosition: 500,
        lastReadAt: new Date(),
      })),
      updateUserBook: jest.fn(),
    });
    const svc = new BookService(repo as never);

    const result = await svc.updateBookProgress({
      userId: "user1",
      bookId: "book1",
      body: { readingTimeSeconds: 50, scrollPosition: 540 },
    });

    expect(repo.updateUserBook).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      readingTimeSeconds: 100,
      scrollPosition: 500,
    });
  });

  it("avance doble: scroll >> tolerancia Y time > persisted → update con ambos + lastReadAt", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        readingTimeSeconds: 100,
        scrollPosition: 500,
        lastReadAt: new Date("2000-01-01T00:00:00Z"),
      })),
      updateUserBook: jest.fn(async (_id, data) => ({
        id: "ub1",
        ...data,
      })),
    });
    const svc = new BookService(repo as never);

    await svc.updateBookProgress({
      userId: "user1",
      bookId: "book1",
      body: { readingTimeSeconds: 200, scrollPosition: 700 },
    });

    expect(repo.updateUserBook).toHaveBeenCalledTimes(1);
    const updateCall = repo.updateUserBook.mock.calls[0];
    expect(updateCall[0]).toBe("ub1");
    expect(updateCall[1]).toMatchObject({
      readingTimeSeconds: 200,
      scrollPosition: 700,
      lastReadAt: expect.any(Date),
    });
  });

  it("avance sólo scroll: time igual a persisted → update sin readingTimeSeconds", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        readingTimeSeconds: 100,
        scrollPosition: 500,
        lastReadAt: new Date(),
      })),
      updateUserBook: jest.fn(async (_id, data) => ({ id: "ub1", ...data })),
    });
    const svc = new BookService(repo as never);

    await svc.updateBookProgress({
      userId: "user1",
      bookId: "book1",
      body: { readingTimeSeconds: 100, scrollPosition: 700 }, // scroll sí, time no
    });

    const updateCall = repo.updateUserBook.mock.calls[0];
    expect(updateCall[1].scrollPosition).toBe(700);
    expect(updateCall[1].readingTimeSeconds).toBeUndefined();
  });

  it("avance sólo time: scroll dentro de tolerancia → update sin scrollPosition", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        readingTimeSeconds: 100,
        scrollPosition: 500,
        lastReadAt: new Date(),
      })),
      updateUserBook: jest.fn(async (_id, data) => ({ id: "ub1", ...data })),
    });
    const svc = new BookService(repo as never);

    await svc.updateBookProgress({
      userId: "user1",
      bookId: "book1",
      body: { readingTimeSeconds: 200, scrollPosition: 510 }, // scroll no (510 < 550), time sí
    });

    const updateCall = repo.updateUserBook.mock.calls[0];
    expect(updateCall[1].readingTimeSeconds).toBe(200);
    expect(updateCall[1].scrollPosition).toBeUndefined();
  });
});

describe("BookService.downloadBookWithUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 403 cuando el user no tiene acceso al libro", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => null),
    });
    const svc = new BookService(repo as never);

    await expect(
      svc.downloadBookWithUrl({ userId: "user1", bookId: "book1" }),
    ).rejects.toThrow(new AppError("FORBIDDEN", 403, "No es tu libro"));
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("retorna URL firmada cuando el user tiene acceso", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        book: { fileKey: "books/user1/file.pdf" },
      })),
    });
    const svc = new BookService(repo as never);

    const result = await svc.downloadBookWithUrl({ userId: "user1", bookId: "book1" });

    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ url: "https://signed.example.com/file.pdf" });
  });
});

describe("BookService.streamBookPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws 403 cuando el user no tiene acceso", async () => {
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => null),
    });
    const svc = new BookService(repo as never);

    await expect(
      svc.streamBookPdf({ userId: "user1", bookId: "book1" }),
    ).rejects.toThrow(new AppError("FORBIDDEN", 403, "No es tu libro"));
  });

  it("throws 500 cuando R2.Body viene null", async () => {
    (r2.send as jest.Mock).mockResolvedValueOnce({ Body: null });
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        book: { fileKey: "books/user1/file.pdf", title: "El Aleph" },
      })),
    });
    const svc = new BookService(repo as never);

    await expect(
      svc.streamBookPdf({ userId: "user1", bookId: "book1" }),
    ).rejects.toThrow(
      new AppError("INTERNAL_ERROR", 500, "Error al obtener el archivo"),
    );
  });

  it("retorna stream + headers cuando R2.Body es un Readable", async () => {
    const fakeBody = Readable.from(Buffer.from("fake pdf"));
    (r2.send as jest.Mock).mockResolvedValueOnce({
      Body: fakeBody,
      ContentLength: 8,
    });
    const repo = makeMockRepo({
      findUserBook: jest.fn(async () => ({
        id: "ub1",
        book: { fileKey: "books/user1/file.pdf", title: "El Aleph" },
      })),
    });
    const svc = new BookService(repo as never);

    const result = await svc.streamBookPdf({ userId: "user1", bookId: "book1" });

    expect(result.body).toBe(fakeBody);
    expect(result.headers).toEqual({
      contentType: "application/pdf",
      contentDisposition: 'inline; filename="El Aleph.pdf"',
      contentLength: 8,
    });
  });
});
