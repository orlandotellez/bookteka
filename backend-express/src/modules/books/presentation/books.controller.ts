import type { Request, RequestHandler, Response } from "express";

type MulterFile = Express.Multer.File;
import { pipeline } from "stream";
import { promisify } from "util";
import { AppError } from "@/core/errors/AppError.js";
import { booksService } from "@/modules/books/application/books.service.js";
import { bodyOf } from "@/core/http/express.utils.js";
import type { UploadBookRequestDTO } from "@/modules/books/domain/books.dto-types.js";
import type { UpdateBookProgressBodySchema } from "@/modules/books/presentation/books.dto.js";

const streamPipeline = promisify(pipeline);

interface UploadBookRequestBody extends UploadBookRequestDTO {}

interface UploadBookRequest extends Request {
  body: UploadBookRequestBody;
}

export const getUserBooks: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const books = await booksService.getUserBooks(userId);
  res.json(books);
};

export const uploadBook = async (
  req: UploadBookRequest,
  res: Response,
): Promise<void> => {
  const userId = req.userId!;

  const files = req.files as { [k: string]: MulterFile[] | undefined } | undefined;
  const file = files?.["file"]?.[0] ?? files?.["pdf"]?.[0];
  if (!file) throw new AppError("BAD_REQUEST", 400, "File not found");

  const result = await booksService.uploadBook({
    userId,
    file,
    body: req.body,
  });

  res.json(result);
};

export const deleteBook: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const result = await booksService.deleteBook({ userId, bookId });
  res.json(result);
};

export const updateBookProgress: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const body = bodyOf<typeof UpdateBookProgressBodySchema>(req);
  const result = await booksService.updateBookProgress({
    userId,
    bookId,
    body,
  });
  res.json(result);
};

export const downloadBookWithUrl: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const result = await booksService.downloadBookWithUrl({ userId, bookId });
  res.json(result);
};

export const streamBookPdf: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const stream = await booksService.streamBookPdf({ userId, bookId });

  res.setHeader("Content-Type", stream.headers.contentType);
  res.setHeader("Content-Disposition", stream.headers.contentDisposition);

  if (stream.headers.contentLength) {
    res.setHeader(
      "Content-Length",
      stream.headers.contentLength.toString(),
    );
  }

  await streamPipeline(stream.body, res);
};
