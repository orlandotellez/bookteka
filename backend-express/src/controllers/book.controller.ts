import type { Request, RequestHandler, Response } from "express";

type MulterFile = Express.Multer.File;
import { pipeline } from "stream";
import { promisify } from "util";
import { AppError } from "@/helper/errors.js";
import { bookService } from "@/services/book.service.js";
import { bodyOf } from "@/helper/express.js";
import type { UploadBookRequestDTO } from "@/dto/book/request.js";
import type { UpdateBookProgressBodySchema } from "@/schema/book.schema.js";

const streamPipeline = promisify(pipeline);

interface UploadBookRequestBody extends UploadBookRequestDTO {}

interface UploadBookRequest extends Request {
  body: UploadBookRequestBody;
}

export const getUserBooks: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const books = await bookService.getUserBooks(userId);
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

  const result = await bookService.uploadBook({
    userId,
    file,
    body: req.body,
  });

  res.json(result);
};

export const deleteBook: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const result = await bookService.deleteBook({ userId, bookId });
  res.json(result);
};

export const updateBookProgress: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const body = bodyOf<typeof UpdateBookProgressBodySchema>(req);
  const result = await bookService.updateBookProgress({
    userId,
    bookId,
    body,
  });
  res.json(result);
};

export const downloadBookWithUrl: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const result = await bookService.downloadBookWithUrl({ userId, bookId });
  res.json(result);
};

export const streamBookPdf: RequestHandler = async (req, res) => {
  const userId = req.userId!;
  const bookId = String(req.params.id ?? "");
  const stream = await bookService.streamBookPdf({ userId, bookId });

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
