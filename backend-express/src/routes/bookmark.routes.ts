import { Router } from "express";
import {
  getBookmarks,
  createBookmark,
  deleteBookmark,
} from "@/controllers/bookmark.controller.js";
import { validate } from "@/middleware/validate.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import {
  BookIdParamSchema,
  BookmarkIdParamSchema,
  CreateBookmarkBodySchema,
} from "@/schema/bookmark.schema.js";

export const bookmark: Router = Router({ mergeParams: true });

bookmark.use(requireAuth);

bookmark.get(
  "/:bookId/bookmarks",
  validate({ params: BookIdParamSchema }),
  getBookmarks,
);

bookmark.post(
  "/:bookId/bookmarks",
  validate({
    params: BookIdParamSchema,
    body: CreateBookmarkBodySchema,
  }),
  createBookmark,
);

bookmark.delete(
  "/:bookId/bookmarks/:bookmarkId",
  validate({ params: BookmarkIdParamSchema }),
  deleteBookmark,
);
