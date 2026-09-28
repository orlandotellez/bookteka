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

// Campos editables de un marcador existente. Deliberadamente NO incluye
// `pageNumber`, `userBookId` ni `userId`: la UI solo edita el nombre y el
// preview, y permitir el resto dejaría que un cliente moviera un marcador a
// otro libro o a otro usuario.
//
// `.refine` exige al menos un campo: un PATCH con `{}` no sería un no-op
// silencioso sino un error explícito, que es más honesto que devolver 200
// sin haber hecho nada.
export const UpdateBookmarkBodySchema = z
  .object({
    name: z.string().min(1, "name requerido").max(200),
    textPreview: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.textPreview !== undefined,
    { message: "Se requiere al menos un campo para actualizar" },
  );
