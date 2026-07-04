import { z } from "zod";

// Schemas de bookmark. Como en book.schema.ts, evitamos `.strict()` para
// no rechazar payloads con campos extra enviados por clientes legacy o
// por terceros que aún no estén alineados al contrato.
const bookIdParam = z.object({
  bookId: z.string().min(1, "bookId requerido"),
});

export const BookIdParamSchema = bookIdParam;

export const BookmarkIdParamSchema = bookIdParam.extend({
  bookmarkId: z.string().min(1, "bookmarkId requerido"),
});

export const CreateBookmarkBodySchema = z.object({
  name: z.string().min(1, "name requerido").max(200),
  pageNumber: z.number().int().positive(),
  textPreview: z.string().max(2000).optional(),
});
