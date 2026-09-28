import type { NextFunction, Request, RequestHandler, Response } from "express";
import { auth } from "@/modules/auth/application/auth.service.js";
import { AppError } from "@/core/errors/AppError.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Protege una ruta aceptando cookie accessToken o Authorization: Bearer. */
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
