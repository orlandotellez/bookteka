import { Router } from "express";
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from "@/modules/bookmarks/presentation/bookmarks.controller.js";
import { validate } from "@/core/http/validate.js";
import { requireAuth } from "@/modules/auth/application/common/auth.guard.js";
import {
  BookIdParamSchema,
  BookmarkIdParamSchema,
  CreateBookmarkBodySchema,
  UpdateBookmarkBodySchema,
} from "@/modules/bookmarks/presentation/bookmarks.dto.js";

export const bookmarksRoutes: Router = Router({ mergeParams: true });

bookmarksRoutes.use(requireAuth);

bookmarksRoutes.get(
  "/:bookId/bookmarks",
  validate({ params: BookIdParamSchema }),
  getBookmarks,
);

bookmarksRoutes.post(
  "/:bookId/bookmarks",
  validate({
    params: BookIdParamSchema,
    body: CreateBookmarkBodySchema,
  }),
  createBookmark,
);

bookmarksRoutes.patch(
  "/:bookId/bookmarks/:bookmarkId",
  validate({
    params: BookmarkIdParamSchema,
    body: UpdateBookmarkBodySchema,
  }),
  updateBookmark,
);

bookmarksRoutes.delete(
  "/:bookId/bookmarks/:bookmarkId",
  validate({ params: BookmarkIdParamSchema }),
  deleteBookmark,
);
