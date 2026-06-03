import { Request, Response } from "express"
import { auth } from "@/lib/auth.js";
import { pipeline } from "stream";
import { promisify } from "util";
import { UploadBookRequestDTO } from "@/dto/book/request.js";
import { DeleteBookParamsDTO, StreamBookParamsDTO, UpdateBookParamsDTO } from "@/dto/book/params.js";
import { BookService } from "@/services/book.service.js";
import { AppError } from "@/helper/errors.js";

interface UploadBookRequest extends Request {
  body: UploadBookRequestDTO;
  file?: Express.Multer.File;
}

type DeleteBookRequest = Request<DeleteBookParamsDTO>
type UpdateBookRequest = Request<UpdateBookParamsDTO>
type DownloadRequest = Request<DeleteBookParamsDTO>;
type StreamRequest = Request<StreamBookParamsDTO>;

const streamPipeline = promisify(pipeline)

// Obtener libros del usuario
export const getUserBooks = async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const books = await BookService.getUserBooks(session.user.id);

    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener libros" });
  }
};

// Subir libro a storage
export const uploadBook = async (req: UploadBookRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "File not found" });
    }

    const result = await BookService.uploadBook({
      userId: session.user.id,
      file: req.file,
      body: req.body,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error interno al procesar el libro",
    });
  }
};

// Eliminar libro del storage
export const deleteBook = async (req: DeleteBookRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const result = await BookService.deleteBook({
      userId: session.user.id,
      bookId: req.params.id,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
      });
    }
    return res.status(500).json({
      error: "Error interno al eliminar el libro",
    });
  }
};

// Actualiza el progreso de lectura de un libro
export const updateBookProgress = async (req: UpdateBookRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const result = await BookService.updateBookProgress({
      userId: session.user.id,
      bookId: req.params.id,
      body: req.body,
    });

    return res.json(result);

  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
      });
    }
    return res.status(500).json({
      error: "Error al actualizar el progreso",
    });
  }
};

// Descargar libro (solo se devuelve el url al cliente para descargar)
export const downloadBookWithUrl = async (
  req: DownloadRequest,
  res: Response
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const result = await BookService.downloadBookWithUrl({
      userId: session.user.id,
      bookId: req.params.id,
    });

    return res.json(result);

  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
      });
    }
    return res.status(500).json({
      error: "Error interno al descargar el libro",
    });
  }
};

// Endpoint para descargar el PDF como stream (proxy para evitar CORS)
export const streamBookPdf = async (req: StreamRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const stream = await BookService.streamBookPdf({
      userId: session.user.id,
      bookId: req.params.id,
    });

    // headers vienen del service
    res.setHeader("Content-Type", stream.headers.contentType);
    res.setHeader(
      "Content-Disposition",
      stream.headers.contentDisposition
    );

    if (stream.headers.contentLength) {
      res.setHeader(
        "Content-Length",
        stream.headers.contentLength.toString()
      );
    }

    // streaming directo
    await streamPipeline(stream.body, res);

  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
      });
    }

    return res.status(500).json({
      error: "Error al procesar el PDF",
    });
  }
};

