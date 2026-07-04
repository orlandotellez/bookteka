import { z } from "zod";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

// Mismo patrón que `lastReadAtSchema` en book.schema.ts: pre-coerce
// string|number a Date antes del refine. Si el input es inválido,
// `.refine(!isNaN)` rechaza explícitamente en español en vez de
// propagar "Invalid Date" silenciosamente al service.
const clientTimestampSchema = z
  .preprocess(
    (v) => (v === undefined ? v : new Date(v as string | number)),
    z
      .date({
        error: "clientTimestamp debe ser string o número",
      })
      .refine((d) => !isNaN(d.getTime()), {
        message: "clientTimestamp inválido",
      }),
  )
  .optional();

// `default({})` permite bodies vacíos para "completar el día de hoy".
export const CompleteDayBodySchema = z
  .object({
    clientDate: z
      .string()
      .regex(YYYY_MM_DD, "clientDate debe tener formato YYYY-MM-DD")
      .optional(),
    clientTimestamp: clientTimestampSchema,
  })
  .default({});

export const InitializeStreakBodySchema = z.object({
  startDate: z
    .string()
    .regex(YYYY_MM_DD, "startDate debe tener formato YYYY-MM-DD"),
});
