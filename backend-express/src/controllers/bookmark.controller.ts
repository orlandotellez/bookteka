import type { RequestHandler } from "express";
import { bookmarkService } from "@/services/bookmark.service.js";
import { bodyOf } from "@/helper/express.js";
import type { CreateBookmarkBodySchema } from "@/schema/bookmark.schema.js";

export const getBookmarks: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const bookmarks = await bookmarkService.getBookmarks(userId, bookId);
  res.json(bookmarks);
};

export const createBookmark: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const data = bodyOf<typeof CreateBookmarkBodySchema>(req);
  const bookmark = await bookmarkService.createBookmark(userId, bookId, data);
  res.status(201).json(bookmark);
};

export const deleteBookmark: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.bookId ?? "");
  const bookmarkId = String(req.params.bookmarkId ?? "");
  const result = await bookmarkService.deleteBookmark(
    userId,
    bookId,
    bookmarkId,
  );
  res.json(result);
};
