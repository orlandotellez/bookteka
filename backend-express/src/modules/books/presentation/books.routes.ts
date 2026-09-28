import multer from "multer";
import { Router } from "express";
import {
  uploadBook,
  deleteBook,
  getUserBooks,
  streamBookPdf,
  updateBookProgress,
  downloadBookWithUrl,
} from "@/modules/books/presentation/books.controller.js";
import { validate } from "@/core/http/validate.js";
import { requireAuth } from "@/modules/auth/application/common/auth.guard.js";
import {
  BookIdParamSchema,
  UpdateBookProgressBodySchema,
} from "@/modules/books/presentation/books.dto.js";

export const booksRoutes: Router = Router();

booksRoutes.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

booksRoutes.post(
  "/upload",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  uploadBook,
);

booksRoutes.get("/", getUserBooks);

booksRoutes.get(
  "/:id/download",
  validate({ params: BookIdParamSchema }),
  downloadBookWithUrl,
);

booksRoutes.get(
  "/:id/stream",
  validate({ params: BookIdParamSchema }),
  streamBookPdf,
);

booksRoutes.patch(
  "/:id/progress",
  validate({
    params: BookIdParamSchema,
    body: UpdateBookProgressBodySchema,
  }),
  updateBookProgress,
);

booksRoutes.delete(
  "/:id",
  validate({ params: BookIdParamSchema }),
  deleteBook,
);
