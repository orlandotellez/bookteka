import cors from "cors";
import type { Request, Response, NextFunction } from "express";

import { isRequestOriginAllowed } from "@/config/origins.js";
import { AppError } from "@/core/errors/AppError.js";

export const corsOptions: cors.CorsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-session-token", "x-refresh-token"],
};

export const corsOriginGuard = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const origin = req.headers.origin;
  if (origin !== undefined && !isRequestOriginAllowed(req, origin)) {
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
