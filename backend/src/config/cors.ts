import cors from "cors";
import type { Request, Response, NextFunction } from "express";

import { isAllowedOrigin } from "@/lib/origins.js";
import { AppError } from "@/helper/errors.js";

export const corsOptions: cors.CorsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
};

export const corsOriginGuard = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const origin = req.headers.origin;
  if (origin !== undefined && !isAllowedOrigin(origin)) {
    return next(
      new AppError(
        "FORBIDDEN",
        403,
        `Origin no permitido por CORS: ${origin}`,
      ),
    );
  }
  next();
};
