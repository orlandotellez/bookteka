import { Request, Response } from "express";
import { auth } from "@/lib/auth.js";
import { BookmarkService } from "@/services/bookmark.service.js";
import { AppError } from "@/helper/errors.js";
import { CreateBookmarkRequestDTO } from "@/dto/bookmark/request.js";
import { CreateBookmarkParams, DeleteBookmarkParams, GetBookmarkParams } from "@/dto/bookmark/params.js";

interface BookmarkWithIdParams extends DeleteBookmarkParams {
  bookmarkId: string;
}

type GetBookmarksRequest = Request<GetBookmarkParams>;
type CreateBookmarkRequest = Request<CreateBookmarkParams, any, CreateBookmarkRequestDTO>;
type DeleteBookmarkRequest = Request<BookmarkWithIdParams>;

// Obtener todos los bookmarks de un libro del usuario
export const getBookmarks = async (req: GetBookmarksRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const bookmarks = await BookmarkService.getBookmarks(
      session.user.id,
      req.params.bookId
    );

    res.json(bookmarks);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Error al obtener bookmarks" });
  }
};

// Crear un nuevo bookmark
export const createBookmark = async (req: CreateBookmarkRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const { name, pageNumber, textPreview } = req.body;

    if (!name || typeof pageNumber !== "number") {
      return res.status(400).json({ error: "Faltan campos requeridos: name, pageNumber" });
    }

    const bookmark = await BookmarkService.createBookmark(
      session.user.id,
      req.params.bookId,
      { name, pageNumber, textPreview }
    );

    res.status(201).json(bookmark);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Error al crear bookmark" });
  }
};

// Eliminar un bookmark
export const deleteBookmark = async (req: DeleteBookmarkRequest, res: Response) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "No autorizado" });

    const result = await BookmarkService.deleteBookmark(
      session.user.id,
      req.params.bookId,
      req.params.bookmarkId
    );

    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Error al eliminar bookmark" });
  }
};
