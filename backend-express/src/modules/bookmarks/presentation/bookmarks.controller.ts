import type { RequestHandler } from "express";
import { bookmarksService } from "@/modules/bookmarks/application/bookmarks.service.js";
import { bodyOf } from "@/core/http/express.utils.js";
import type {
  CreateBookmarkBodySchema,
  UpdateBookmarkBodySchema,
} from "@/modules/bookmarks/presentation/bookmarks.dto.js";

export const getBookmarks: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const bookmarks = await bookmarksService.getBookmarks(userId, bookId);
  res.json(bookmarks);
};

export const createBookmark: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const data = bodyOf<typeof CreateBookmarkBodySchema>(req);
  const bookmark = await bookmarksService.createBookmark(userId, bookId, data);
  res.status(201).json(bookmark);
};

export const updateBookmark: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const bookmarkId = String(req.params.bookmarkId ?? "");
  const data = bodyOf<typeof UpdateBookmarkBodySchema>(req);
  const bookmark = await bookmarksService.updateBookmark(
    userId,
    bookId,
    bookmarkId,
    data,
  );
  res.json(bookmark);
};

export const deleteBookmark: RequestHandler = async (req, res) => {  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const bookmarkId = String(req.params.bookmarkId ?? "");
  const result = await bookmarksService.deleteBookmark(
    userId,
    bookId,
    bookmarkId,
  );
  res.json(result);
};
