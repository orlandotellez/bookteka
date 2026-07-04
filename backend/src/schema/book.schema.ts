import { z } from "zod";

const ID = z.string().min(1, "id requerido");

export const BookIdParamSchema = z.object({
  id: ID,
});

// Body schemas usan el comportamiento por defecto de Zod (.strip()):
// claves desconocidas se descartan silenciosamente en lugar de fallar.
// Esto evita romper clientes que envían campos extra o legacy y mantiene
// la API permisiva hacia adelante mientras endurecemos el contrato en
// el servidor.

// `lastReadAtSchema` acepta string ISO-8601 o número (epoch ms) y los
// pre-coerce a `Date` antes del refine. Si el input es inválido (string
// mal formado o número absurdo), `.refine(!isNaN)` rechaza con un
// mensaje explícito en español — antes esto pasaba silenciosamente como
// "Invalid Date" persistido como `null` en Prisma.
const lastReadAtSchema = z
  .preprocess(
    (v) => (v === undefined ? v : new Date(v as string | number)),
    z
      .date({ error: "lastReadAt debe ser string o número" })
      .refine((d) => !isNaN(d.getTime()), { message: "lastReadAt inválido" }),
  )
  .optional();

export const UpdateBookProgressBodySchema = z.object({
  readingTimeSeconds: z.number().int().nonnegative().optional(),
  scrollPosition: z.number().int().nonnegative().optional(),
  lastReadAt: lastReadAtSchema,
});
