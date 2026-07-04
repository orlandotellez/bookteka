import multer from "multer";
import { Router } from "express";
import {
  uploadBook,
  deleteBook,
  getUserBooks,
  streamBookPdf,
  updateBookProgress,
  downloadBookWithUrl,
} from "@/controllers/book.controller.js";
import { validate } from "@/middleware/validate.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import {
  BookIdParamSchema,
  UpdateBookProgressBodySchema,
} from "@/schema/book.schema.js";

export const book: Router = Router();

book.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

book.post(
  "/upload",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  uploadBook,
);

book.get("/", getUserBooks);

book.get(
  "/:id/download",
  validate({ params: BookIdParamSchema }),
  downloadBookWithUrl,
);

book.get(
  "/:id/stream",
  validate({ params: BookIdParamSchema }),
  streamBookPdf,
);

book.patch(
  "/:id/progress",
  validate({
    params: BookIdParamSchema,
    body: UpdateBookProgressBodySchema,
  }),
  updateBookProgress,
);

book.delete(
  "/:id",
  validate({ params: BookIdParamSchema }),
  deleteBook,
);
