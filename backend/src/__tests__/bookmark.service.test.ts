// @ts-nocheck
import { jest } from "@jest/globals";

jest.unstable_mockModule("@/config/prisma.js", () => ({
  dbPrisma: {
    user_book: {},
    bookmark: {},
  },
}));

const { BookmarkService } = await import("@/services/bookmark.service.js");
const { AppError } = await import("@/helper/errors.js");

const makeMockRepo = (overrides: any = {}): any => ({
  findUserBookAccess: jest.fn(async () => undefined),
  getBookmarksByUserBookId: jest.fn(async () => undefined),
  createBookmark: jest.fn(async () => undefined),
  findBookmark: jest.fn(async () => undefined),
  deleteBookmark: jest.fn(async () => undefined),
  ...overrides,
});

describe("BookmarkService.getBookmarks", () => {
  it("retorna los bookmarks del user_book cuando el usuario tiene acceso", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => ({ id: "ub1" })),
      getBookmarksByUserBookId: jest.fn(async () => [
        { id: "bm1", name: "Cap 1", pageNumber: 1 },
        { id: "bm2", name: "Cap 2", pageNumber: 5 },
      ]),
    });
    const svc = new BookmarkService(repo as never);

    const result = await svc.getBookmarks("user1", "book1");

    expect(result).toHaveLength(2);
    expect(repo.findUserBookAccess).toHaveBeenCalledWith("user1", "book1");
    expect(repo.getBookmarksByUserBookId).toHaveBeenCalledWith("ub1");
  });

  it("throws AppError 403 cuando el userBook no existe", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => null),
    });
    const svc = new BookmarkService(repo as never);

    await expect(svc.getBookmarks("user1", "book1")).rejects.toThrow(
      new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado"),
    );
    expect(repo.getBookmarksByUserBookId).not.toHaveBeenCalled();
  });
});

describe("BookmarkService.createBookmark", () => {
  it("persiste el bookmark con `{userId, userBookId, ...data}` splat", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => ({ id: "ub1" })),
      createBookmark: jest.fn(async (data) => ({ id: "bm-new", ...data })),
    });
    const svc = new BookmarkService(repo as never);

    const result = await svc.createBookmark("user1", "book1", {
      name: "Test bookmark",
      pageNumber: 7,
      textPreview: "Preview text",
    });

    expect(repo.createBookmark).toHaveBeenCalledWith({
      userId: "user1",
      userBookId: "ub1",
      name: "Test bookmark",
      pageNumber: 7,
      textPreview: "Preview text",
    });
    expect(result).toMatchObject({
      id: "bm-new",
      userId: "user1",
      userBookId: "ub1",
    });
  });

  it("throws AppError 403 cuando el userBook no existe", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => null),
    });
    const svc = new BookmarkService(repo as never);

    await expect(
      svc.createBookmark("user1", "book1", { name: "t", pageNumber: 1 }),
    ).rejects.toThrow(
      new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado"),
    );
    expect(repo.createBookmark).not.toHaveBeenCalled();
  });
});

describe("BookmarkService.deleteBookmark", () => {
  it("borra el bookmark tras verificar doble ownership (userBook + bookmark)", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => ({ id: "ub1" })),
      findBookmark: jest.fn(async () => ({ id: "bm1" })),
      deleteBookmark: jest.fn(async () => ({ id: "bm1" })),
    });
    const svc = new BookmarkService(repo as never);

    const result = await svc.deleteBookmark("user1", "book1", "bm1");

    expect(repo.findUserBookAccess).toHaveBeenCalledWith("user1", "book1");
    expect(repo.findBookmark).toHaveBeenCalledWith("bm1", "ub1");
    expect(repo.deleteBookmark).toHaveBeenCalledWith("bm1");
    expect(result).toEqual({ success: true });
  });

  it("throws 403 si el userBook no existe — no consulta el bookmark", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => null),
    });
    const svc = new BookmarkService(repo as never);

    await expect(svc.deleteBookmark("user1", "book1", "bm1")).rejects.toThrow(
      new AppError("FORBIDDEN", 403, "No autorizado o libro no encontrado"),
    );
    expect(repo.findBookmark).not.toHaveBeenCalled();
    expect(repo.deleteBookmark).not.toHaveBeenCalled();
  });

  it("throws 404 si el bookmark no pertenece al userBook", async () => {
    const repo = makeMockRepo({
      findUserBookAccess: jest.fn(async () => ({ id: "ub1" })),
      findBookmark: jest.fn(async () => null),
    });
    const svc = new BookmarkService(repo as never);

    await expect(svc.deleteBookmark("user1", "book1", "bm1")).rejects.toThrow(
      new AppError("NOT_FOUND", 404, "Bookmark no encontrado"),
    );
    expect(repo.deleteBookmark).not.toHaveBeenCalled();
  });
});
