import type { Request } from "express";
import type { ZodTypeAny, z } from "zod";

export function bodyOf<S extends ZodTypeAny>(req: Request): z.infer<S> {
  return req.body as z.infer<S>;
}

