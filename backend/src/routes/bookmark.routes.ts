import { Router } from "express";
import {
  getBookmarks,
  createBookmark,
  deleteBookmark,
} from "@/controllers/bookmark.controller.js";

export const bookmark: Router = Router({ mergeParams: true });

// Obtener todos los bookmarks de un libro
bookmark.get("/:bookId/bookmarks", getBookmarks);

// Crear un nuevo bookmark
bookmark.post("/:bookId/bookmarks", createBookmark);

// Eliminar un bookmark
bookmark.delete("/:bookId/bookmarks/:bookmarkId", deleteBookmark);
