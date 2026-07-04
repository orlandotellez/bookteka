import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type ValidationSections = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * HOF genérico `validate<S extends ValidationSections>(sections: S)`.
 *
 * El parámetro `S` es **phantom**: existe sólo a nivel de TypeScript
 * para que el controller pueda hacer
 * `bodyOf<typeof S["body"]>(req)` y obtener el body tipado como
 * `z.infer<typeof S["body"]>` sin pagar overhead runtime.
 *
 * Runtime (idéntico al previo):
 *  - `sections.body` se parsea contra `req.body` y el resultado se
 *    reasigna a `req.body`.
 *  - `sections.query` igual contra `req.query` (cast a `Request["query"]`
 *    para evitar depender de `@types/qs` directo).
 *  - `sections.params` se parsea y se reasigna campo-a-campo a
 *    `req.params` para mantener el shape `Record<string, string>` que
 *    espera `@types/express-serve-static-core`.
 *  - Cualquier `ZodError` se propaga vía `next(err)` al `errorHandler`
 *    central que lo mapea a 400 con shape `{ error, details[] }`.
 */
export function validate<S extends ValidationSections>(sections: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (sections.body) {
        req.body = sections.body.parse(req.body);
      }
      if (sections.query) {
        // `req.query` está tipado por Express como `ParsedQs`; reasignamos
        // con un cast pasando por `Request["query"]` para evitar depender
        // de `@types/qs` como dependencia de primer nivel.
        req.query = sections.query.parse(req.query) as Request["query"];
      }
      if (sections.params) {
        const parsed = sections.params.parse(req.params) as Record<
          string,
          string
        >;
        for (const key of Object.keys(parsed)) {
          (req.params as Record<string, string>)[key] = parsed[key];
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
