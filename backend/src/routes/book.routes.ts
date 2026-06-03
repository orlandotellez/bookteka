import multer from "multer";
import { Router } from "express";
import { uploadBook, deleteBook, getUserBooks, streamBookPdf, updateBookProgress, downloadBookWithUrl } from "@/controllers/book.controller.js"

export const book: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

book.get("/", getUserBooks)

book.post("/upload", upload.single("file"), uploadBook)

book.get("/:id/download", downloadBookWithUrl);

// Endpoint para streaming del PDF (evita CORS)
book.get("/:id/stream", streamBookPdf);

// Endpoint para actualizar el progreso de lectura
book.patch("/:id/progress", updateBookProgress);

book.delete("/:id", deleteBook);
