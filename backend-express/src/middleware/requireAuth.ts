import type { NextFunction, Request, RequestHandler, Response } from "express";
import { auth } from "@/lib/auth.js";
import { AppError } from "@/helper/errors.js";

// Module augmentation: agregamos `userId` al `Express.Request` global
// para que cualquier handler que se monte DESPUÉS de `requireAuth` lo
// lea type-safe desde `req.userId`. Antes de pasar por el middleware
// el campo puede ser `undefined`; después de `requireAuth` está
// garantizado (los handlers pueden usar `req.userId!` con la
// anotación `// requireAuth ya validó la sesión`).
//
// Usamos `declare global { namespace Express }` porque es el alias
// que `@types/express` re-exporta desde `express-serve-static-core`;
// evita el problema de "module not found" cuando el augment target
// no es resolvable directamente desde el archivo que declara.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware de autenticación para rutas protegidas.
 *
 * Lee la sesión de better-auth vía `auth.api.getSession`, setea
 * `req.userId` con el id del usuario y llama a `next()`.
 *
 * Si NO hay sesión válida, lanza `AppError("UNAUTHORIZED", 401,
 * "No autorizado")` que `next(err)` propaga al `errorHandler` central.
 * Express 5 propaga async errors de middleware nativamente, así que la
 * respuesta JSON mantiene el mismo shape `{ error, code }` que los
 * demás errores de la app.
 *
 * Aplicar SIEMPRE en el router con `router.use(requireAuth)` ANTES de
 * cualquier `validate({ body, params, query })` y antes del controller,
 * para que el orden canónico sea: auth → validate → handler.
 */
export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      throw new AppError("UNAUTHORIZED", 401, "No autorizado");
    }
    req.userId = session.user.id;
    next();
  } catch (err) {
    next(err);
  }
};
